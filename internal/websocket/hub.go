package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/feels/feels/internal/domain/message"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// presenceRefreshInterval is how often all currently-connected users have their
// last_active bumped, so long foreground sessions keep floating up in the feed.
const presenceRefreshInterval = 3 * time.Minute

// PresenceRecorder persists user activity so the feed can float currently-online
// users up. Satisfied by the profile repository's TouchLastActive.
type PresenceRecorder interface {
	TouchLastActive(ctx context.Context, userIDs []uuid.UUID) error
}

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			// Allow all origins - auth is handled via token
			return true
		},
	}
)

// Client represents a connected WebSocket client
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	userID uuid.UUID
	send   chan []byte
}

// Hub maintains active WebSocket connections
type Hub struct {
	clients    map[uuid.UUID]map[*Client]bool // userID -> clients
	register   chan *Client
	unregister chan *Client
	broadcast  chan userMessage
	presence   PresenceRecorder
	mu         sync.RWMutex
}

type userMessage struct {
	userID uuid.UUID
	data   []byte
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[uuid.UUID]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan userMessage, 256),
	}
}

// SetPresenceRecorder wires presence tracking for the activity-weighted feed.
// Must be called before Run() — the recorder is read from the hub goroutine
// without a lock, so setting it beforehand avoids a data race.
func (h *Hub) SetPresenceRecorder(p PresenceRecorder) {
	h.presence = p
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	ticker := time.NewTicker(presenceRefreshInterval)
	defer ticker.Stop()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.userID] == nil {
				h.clients[client.userID] = make(map[*Client]bool)
			}
			h.clients[client.userID][client] = true
			h.mu.Unlock()
			h.touch(client.userID)
			log.Printf("Client connected: user %s", client.userID)

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.userID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)
					if len(clients) == 0 {
						delete(h.clients, client.userID)
					}
				}
			}
			h.mu.Unlock()
			h.touch(client.userID)
			log.Printf("Client disconnected: user %s", client.userID)

		case <-ticker.C:
			h.refreshPresence()

		case msg := <-h.broadcast:
			h.mu.RLock()
			if clients, ok := h.clients[msg.userID]; ok {
				for client := range clients {
					select {
					case client.send <- msg.data:
					default:
						close(client.send)
						delete(clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// touch marks a single user active (on connect/disconnect). Fire-and-forget so
// it never blocks the hub loop.
func (h *Hub) touch(userID uuid.UUID) {
	if h.presence == nil {
		return
	}
	go func() {
		if err := h.presence.TouchLastActive(context.Background(), []uuid.UUID{userID}); err != nil {
			log.Printf("presence touch failed for %s: %v", userID, err)
		}
	}()
}

// refreshPresence bumps last_active for every currently-connected user in one
// batch, so users with the app open keep counting as recently active.
func (h *Hub) refreshPresence() {
	if h.presence == nil {
		return
	}
	h.mu.RLock()
	ids := make([]uuid.UUID, 0, len(h.clients))
	for id := range h.clients {
		ids = append(ids, id)
	}
	h.mu.RUnlock()
	if len(ids) == 0 {
		return
	}
	go func() {
		if err := h.presence.TouchLastActive(context.Background(), ids); err != nil {
			log.Printf("presence refresh failed: %v", err)
		}
	}()
}

// SendToUser sends a message to all connections for a user
// Accepts any message type that can be marshaled to JSON
func (h *Hub) SendToUser(userID uuid.UUID, msg interface{}) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	h.broadcast <- userMessage{
		userID: userID,
		data:   data,
	}
}

// HandleWebSocket handles a new WebSocket connection
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request, userID uuid.UUID) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:    h,
		conn:   conn,
		userID: userID,
		send:   make(chan []byte, 256),
	}

	h.register <- client

	go client.writePump()
	go client.readPump()
}

// readPump reads messages from the WebSocket connection
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024) // 512KB max message size
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle incoming messages (typing indicators, etc.)
		var msg message.WSMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}

		// Process client messages if needed
		// For now, we mainly use server -> client communication
	}
}

// writePump writes messages to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Batch any queued messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// IsUserOnline checks if a user has any active connections
func (h *Hub) IsUserOnline(userID uuid.UUID) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	clients, ok := h.clients[userID]
	return ok && len(clients) > 0
}

// GetOnlineUsers returns the count of online users
func (h *Hub) GetOnlineUsers() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
