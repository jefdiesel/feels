package storage

import (
	"context"
	"fmt"
	"io"
	"path"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type S3Client struct {
	client   *minio.Client
	bucket   string
	endpoint string
	useSSL   bool
}

type S3Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

func NewS3Client(cfg S3Config) (*S3Client, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create S3 client: %w", err)
	}

	return &S3Client{
		client:   client,
		bucket:   cfg.Bucket,
		endpoint: cfg.Endpoint,
		useSSL:   cfg.UseSSL,
	}, nil
}

func (s *S3Client) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("failed to check bucket: %w", err)
	}
	if !exists {
		err = s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %w", err)
		}
	}
	return nil
}

func (s *S3Client) UploadPhoto(ctx context.Context, userID uuid.UUID, reader io.Reader, size int64, contentType string) (string, error) {
	filename := fmt.Sprintf("%s/%s%s", userID.String(), uuid.New().String(), getExtension(contentType))

	_, err := s.client.PutObject(ctx, s.bucket, filename, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload photo to bucket %s at %s: %w", s.bucket, s.endpoint, err)
	}

	return s.GetPublicURL(filename), nil
}

func (s *S3Client) DeletePhoto(ctx context.Context, url string) error {
	objectName := s.urlToObjectName(url)
	if objectName == "" {
		return nil
	}
	return s.client.RemoveObject(ctx, s.bucket, objectName, minio.RemoveObjectOptions{})
}

func (s *S3Client) GetPublicURL(objectName string) string {
	scheme := "http"
	if s.useSSL {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s/%s/%s", scheme, s.endpoint, s.bucket, objectName)
}

func (s *S3Client) GetPresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	url, err := s.client.PresignedGetObject(ctx, s.bucket, objectName, expiry, nil)
	if err != nil {
		return "", err
	}
	return url.String(), nil
}

func (s *S3Client) urlToObjectName(url string) string {
	prefix := fmt.Sprintf("http://%s/%s/", s.endpoint, s.bucket)
	if s.useSSL {
		prefix = fmt.Sprintf("https://%s/%s/", s.endpoint, s.bucket)
	}
	if len(url) > len(prefix) && url[:len(prefix)] == prefix {
		return url[len(prefix):]
	}
	return ""
}

func getExtension(contentType string) string {
	switch contentType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return path.Ext(contentType)
	}
}

var allowedContentTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
	"image/webp": true,
}

func IsAllowedContentType(contentType string) bool {
	return allowedContentTypes[contentType]
}

const MaxPhotoSize = 10 * 1024 * 1024 // 10MB
