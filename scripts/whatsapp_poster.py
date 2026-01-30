"""
WhatsApp Poster Generator
Combines an image + description + booking link into a single JPEG poster
suitable for sharing via WhatsApp.

Usage:
    python whatsapp_poster.py --image product.jpg --description "Scalextric Ford GT" --url "https://r66slot.co.za/book/abc123"
    python whatsapp_poster.py --image https://example.com/car.jpg --description "NSR Porsche 917K" --url "https://r66slot.co.za/book/def456" --output poster.jpg
"""

import argparse
import os
import sys
import textwrap
from io import BytesIO
from urllib.request import urlopen, Request
from urllib.error import URLError

from PIL import Image, ImageDraw, ImageFont


# ─── Configuration ───────────────────────────────────────────────────────────

POSTER_WIDTH = 1080            # Final poster width in pixels
IMAGE_MAX_HEIGHT = 1080        # Max height for the product image
PADDING = 40                   # Horizontal and vertical padding
TEXT_COLOR = (255, 255, 255)   # White text
BG_COLOR = (31, 41, 55)       # Dark gray background (#1F2937)
ACCENT_COLOR = (220, 38, 38)  # Racing red (#DC2626)
LINK_BG_COLOR = (220, 38, 38) # Red button background
LINK_TEXT_COLOR = (255, 255, 255)
JPEG_QUALITY = 92
DESCRIPTION_FONT_SIZE = 32
LINK_FONT_SIZE = 28
HEADING_FONT_SIZE = 20
LINE_SPACING = 8
MAX_TEXT_WIDTH_CHARS = 45      # Character wrap width for description


# ─── Font Loading ────────────────────────────────────────────────────────────

def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Load a TrueType font, falling back to default if unavailable."""
    # Common font paths across platforms
    font_candidates = []

    if bold:
        font_candidates = [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
    else:
        font_candidates = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]

    for font_path in font_candidates:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except (IOError, OSError):
                continue

    # Fallback to Pillow's built-in font
    return ImageFont.load_default()


# ─── Image Loading ───────────────────────────────────────────────────────────

def load_image(source: str) -> Image.Image:
    """Load an image from a local file path or a URL."""
    if source.startswith(("http://", "https://")):
        try:
            req = Request(source, headers={"User-Agent": "R66Slot-Poster/1.0"})
            response = urlopen(req, timeout=15)
            data = response.read()
            return Image.open(BytesIO(data))
        except (URLError, IOError) as e:
            print(f"Error downloading image from URL: {e}")
            sys.exit(1)
    else:
        if not os.path.exists(source):
            print(f"Error: Image file not found: {source}")
            sys.exit(1)
        return Image.open(source)


# ─── Text Rendering Helpers ──────────────────────────────────────────────────

def get_text_block_height(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> tuple[list[str], int]:
    """Wrap text and calculate total height. Returns (lines, total_height)."""
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip() if current_line else word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        line_width = bbox[2] - bbox[0]

        if line_width <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    if not lines:
        lines = [""]

    # Calculate total height
    line_height = draw.textbbox((0, 0), "Ay", font=font)[3] - draw.textbbox((0, 0), "Ay", font=font)[1]
    total_height = len(lines) * (line_height + LINE_SPACING) - LINE_SPACING

    return lines, total_height


def draw_text_block(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font: ImageFont.FreeTypeFont,
    x: int,
    y: int,
    color: tuple[int, int, int],
    center: bool = False,
    canvas_width: int = 0,
) -> int:
    """Draw wrapped text lines. Returns the Y position after the last line."""
    line_height = draw.textbbox((0, 0), "Ay", font=font)[3] - draw.textbbox((0, 0), "Ay", font=font)[1]

    for line in lines:
        if center and canvas_width > 0:
            bbox = draw.textbbox((0, 0), line, font=font)
            lw = bbox[2] - bbox[0]
            draw_x = (canvas_width - lw) // 2
        else:
            draw_x = x

        draw.text((draw_x, y), line, fill=color, font=font)
        y += line_height + LINE_SPACING

    return y


# ─── Poster Generation ──────────────────────────────────────────────────────

def generate_poster(
    image_source: str,
    description: str,
    url: str,
    output_path: str = "poster.jpg",
) -> str:
    """
    Generate a WhatsApp-ready poster JPEG.

    Args:
        image_source: Local file path or URL to the product image.
        description: Product description text.
        url: Booking/destination URL (displayed as "Book Here").
        output_path: Path for the output JPEG file.

    Returns:
        The output file path.
    """

    # Load and resize the product image to fit poster width
    product_img = load_image(image_source).convert("RGB")

    # Scale image to poster width while maintaining aspect ratio
    img_ratio = product_img.width / product_img.height
    scaled_width = POSTER_WIDTH
    scaled_height = int(scaled_width / img_ratio)

    # Cap height if too tall
    if scaled_height > IMAGE_MAX_HEIGHT:
        scaled_height = IMAGE_MAX_HEIGHT
        scaled_width = int(scaled_height * img_ratio)

    product_img = product_img.resize((scaled_width, scaled_height), Image.LANCZOS)

    # Load fonts
    desc_font = load_font(DESCRIPTION_FONT_SIZE)
    link_font = load_font(LINK_FONT_SIZE, bold=True)
    heading_font = load_font(HEADING_FONT_SIZE, bold=True)

    # Create a temporary draw context to measure text
    temp_img = Image.new("RGB", (POSTER_WIDTH, 100))
    temp_draw = ImageDraw.Draw(temp_img)

    max_text_width = POSTER_WIDTH - (PADDING * 2)

    # Measure description text
    desc_lines, desc_height = get_text_block_height(
        temp_draw, description, desc_font, max_text_width
    )

    # Measure "Book Here" button
    button_text = "Book Here"
    btn_bbox = temp_draw.textbbox((0, 0), button_text, font=link_font)
    btn_text_w = btn_bbox[2] - btn_bbox[0]
    btn_text_h = btn_bbox[3] - btn_bbox[1]
    btn_padding_x = 40
    btn_padding_y = 16
    btn_width = btn_text_w + btn_padding_x * 2
    btn_height = btn_text_h + btn_padding_y * 2

    # Measure the URL text below button
    url_font = load_font(16)
    url_bbox = temp_draw.textbbox((0, 0), url, font=url_font)
    url_text_h = url_bbox[3] - url_bbox[1]

    # ─── Calculate canvas height ───
    # Layout: [image] [padding] [R66SLOT header] [padding/2] [description] [padding] [button] [small gap] [url] [padding]
    header_height = 30
    canvas_height = (
        scaled_height          # Product image
        + PADDING              # Space after image
        + header_height        # "R66SLOT" branding line
        + PADDING // 2         # Space after header
        + desc_height          # Description text
        + PADDING              # Space before button
        + btn_height           # Book Here button
        + 12                   # Gap between button and URL
        + url_text_h           # URL text
        + PADDING              # Bottom padding
    )

    # ─── Create the poster canvas ───
    canvas = Image.new("RGB", (POSTER_WIDTH, canvas_height), BG_COLOR)

    # Paste product image (centered horizontally if narrower than canvas)
    img_x = (POSTER_WIDTH - scaled_width) // 2
    canvas.paste(product_img, (img_x, 0))

    draw = ImageDraw.Draw(canvas)
    y_cursor = scaled_height + PADDING

    # ─── Draw accent line + branding ───
    draw.rectangle(
        [(PADDING, y_cursor), (POSTER_WIDTH - PADDING, y_cursor + 3)],
        fill=ACCENT_COLOR,
    )
    y_cursor += 10

    brand_text = "R66SLOT"
    brand_bbox = draw.textbbox((0, 0), brand_text, font=heading_font)
    brand_w = brand_bbox[2] - brand_bbox[0]
    draw.text(
        ((POSTER_WIDTH - brand_w) // 2, y_cursor),
        brand_text,
        fill=ACCENT_COLOR,
        font=heading_font,
    )
    y_cursor += header_height + PADDING // 2

    # ─── Draw description ───
    y_cursor = draw_text_block(
        draw, desc_lines, desc_font,
        x=PADDING, y=y_cursor,
        color=TEXT_COLOR,
        center=True,
        canvas_width=POSTER_WIDTH,
    )

    y_cursor += PADDING // 2

    # ─── Draw "Book Here" button ───
    btn_x = (POSTER_WIDTH - btn_width) // 2
    btn_y = y_cursor

    # Rounded rectangle button
    draw.rounded_rectangle(
        [(btn_x, btn_y), (btn_x + btn_width, btn_y + btn_height)],
        radius=12,
        fill=LINK_BG_COLOR,
    )

    # Button text centered inside
    draw.text(
        (btn_x + btn_padding_x, btn_y + btn_padding_y),
        button_text,
        fill=LINK_TEXT_COLOR,
        font=link_font,
    )

    y_cursor = btn_y + btn_height + 12

    # ─── Draw URL below button (subtle, smaller) ───
    url_w = url_bbox[2] - url_bbox[0]
    draw.text(
        ((POSTER_WIDTH - url_w) // 2, y_cursor),
        url,
        fill=(156, 163, 175),  # Gray-400
        font=url_font,
    )

    # ─── Save as JPEG ───
    canvas.save(output_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
    print(f"Poster saved: {output_path}")
    print(f"Dimensions: {POSTER_WIDTH}x{canvas_height}px")
    print(f"File size: {os.path.getsize(output_path) / 1024:.1f} KB")

    return output_path


# ─── WhatsApp API Integration (Meta Cloud API) ──────────────────────────────

def send_whatsapp_poster(
    poster_path: str,
    recipient_phone: str,
    caption: str = "",
    api_token: str = "",
    phone_number_id: str = "",
):
    """
    Send the generated poster as a WhatsApp media message via Meta Cloud API.

    This is a placeholder showing the integration flow.
    In production, replace with actual API calls or use the
    existing WhatsApp integration in the R66Slot app.

    Args:
        poster_path: Path to the generated JPEG poster.
        recipient_phone: Recipient phone number (international format, no +).
        caption: Optional message caption.
        api_token: WhatsApp Business API access token.
        phone_number_id: WhatsApp phone number ID.
    """
    import json
    from urllib.request import Request, urlopen
    from urllib.parse import urlencode

    WHATSAPP_API_URL = "https://graph.facebook.com/v21.0"

    # Step 1: Upload the image as media
    # In production, use multipart/form-data upload
    print(f"\n--- WhatsApp Send Flow ---")
    print(f"1. Upload media: POST {WHATSAPP_API_URL}/{phone_number_id}/media")
    print(f"   File: {poster_path}")

    # Step 2: Send the media message
    message_payload = {
        "messaging_product": "whatsapp",
        "to": recipient_phone,
        "type": "image",
        "image": {
            "id": "<MEDIA_ID_FROM_UPLOAD>",
            "caption": caption or "Check out this product from R66Slot!",
        },
    }

    print(f"2. Send message: POST {WHATSAPP_API_URL}/{phone_number_id}/messages")
    print(f"   Payload: {json.dumps(message_payload, indent=2)}")
    print(f"   Recipient: {recipient_phone}")
    print(f"--- End Flow ---\n")

    # Actual implementation would be:
    # -----------------------------------------------------------------
    # import requests
    #
    # # Upload media
    # upload_url = f"{WHATSAPP_API_URL}/{phone_number_id}/media"
    # headers = {"Authorization": f"Bearer {api_token}"}
    # with open(poster_path, "rb") as f:
    #     files = {"file": (os.path.basename(poster_path), f, "image/jpeg")}
    #     data = {"messaging_product": "whatsapp"}
    #     resp = requests.post(upload_url, headers=headers, files=files, data=data)
    #     media_id = resp.json()["id"]
    #
    # # Send image message
    # send_url = f"{WHATSAPP_API_URL}/{phone_number_id}/messages"
    # payload = {
    #     "messaging_product": "whatsapp",
    #     "to": recipient_phone,
    #     "type": "image",
    #     "image": {"id": media_id, "caption": caption},
    # }
    # resp = requests.post(send_url, headers=headers, json=payload)
    # return resp.json()
    # -----------------------------------------------------------------


# ─── CLI Entry Point ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate a WhatsApp-ready product poster for R66Slot"
    )
    parser.add_argument(
        "--image", "-i",
        required=True,
        help="Path or URL to the product image",
    )
    parser.add_argument(
        "--description", "-d",
        required=True,
        help="Product description text",
    )
    parser.add_argument(
        "--url", "-u",
        required=True,
        help="Booking/destination URL",
    )
    parser.add_argument(
        "--output", "-o",
        default="poster.jpg",
        help="Output JPEG file path (default: poster.jpg)",
    )
    parser.add_argument(
        "--send",
        metavar="PHONE",
        help="Send poster via WhatsApp to this phone number (placeholder)",
    )

    args = parser.parse_args()

    # Generate the poster
    output = generate_poster(
        image_source=args.image,
        description=args.description,
        url=args.url,
        output_path=args.output,
    )

    # Optionally show WhatsApp send flow
    if args.send:
        send_whatsapp_poster(
            poster_path=output,
            recipient_phone=args.send,
            caption=args.description,
        )


if __name__ == "__main__":
    main()
