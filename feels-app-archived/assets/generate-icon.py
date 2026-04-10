#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

SIZE = 1024
CORNER_RADIUS = 220

def create_rounded_rectangle(size, radius, color):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=color)
    return img

def main():
    # Create base with black squircle
    img = create_rounded_rectangle(SIZE, CORNER_RADIUS, (0, 0, 0, 255))

    # Load Zapfino for elegant script
    font_size = 180
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Zapfino.ttf', font_size)
        print("Using Zapfino")
    except:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/SnellRoundhand.ttc', font_size)
        print("Using Snell Roundhand")

    text = "Feels"
    position = (SIZE // 2, SIZE // 2 + 30)

    # Hot pink/magenta neon color
    neon_color = (255, 16, 120)  # Hot pink

    # Create intense outer glow layers
    glow_layers = [
        (60, (255, 16, 120, 40)),   # Outermost - wide spread
        (45, (255, 16, 120, 60)),
        (30, (255, 16, 120, 90)),
        (20, (255, 50, 140, 120)),
        (12, (255, 80, 160, 160)),
        (6, (255, 120, 180, 200)),   # Inner glow
    ]

    for blur, color in glow_layers:
        glow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        draw.text(position, text, font=font, fill=color, anchor='mm')
        glow = glow.filter(ImageFilter.GaussianBlur(blur))
        img = Image.alpha_composite(img, glow)

    # Draw the bright neon tube (core)
    draw = ImageDraw.Draw(img)

    # Bright pink core
    draw.text(position, text, font=font, fill=(255, 100, 150), anchor='mm')

    # White-hot center for neon tube effect
    draw.text(position, text, font=font, fill=(255, 180, 200), anchor='mm')

    # Brightest white center
    inner = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    inner_draw = ImageDraw.Draw(inner)
    inner_draw.text(position, text, font=font, fill=(255, 220, 230, 200), anchor='mm')
    inner = inner.filter(ImageFilter.GaussianBlur(1))
    img = Image.alpha_composite(img, inner)

    # Save main icon
    output = os.path.join(os.path.dirname(__file__), 'icon-new.png')
    img.save(output, 'PNG')
    print(f"Saved: {output}")

    # Adaptive icon - foreground only on transparent
    adaptive = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))

    for blur, color in glow_layers:
        glow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        draw.text(position, text, font=font, fill=color, anchor='mm')
        glow = glow.filter(ImageFilter.GaussianBlur(blur))
        adaptive = Image.alpha_composite(adaptive, glow)

    draw = ImageDraw.Draw(adaptive)
    draw.text(position, text, font=font, fill=(255, 100, 150), anchor='mm')
    draw.text(position, text, font=font, fill=(255, 180, 200), anchor='mm')

    adaptive_out = os.path.join(os.path.dirname(__file__), 'adaptive-icon-new.png')
    adaptive.save(adaptive_out, 'PNG')
    print(f"Saved: {adaptive_out}")

if __name__ == '__main__':
    main()
