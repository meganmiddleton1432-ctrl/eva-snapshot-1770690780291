from PIL import Image, ImageGrab
import io
import base64

def capture_metrics_panel():
    # Coordinates and logic to capture relevant UI panel
    img = ImageGrab.grab(bbox=(left, top, right, bottom))  # Example: screen region
    return img

def encode_image_to_base64(img):
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_bytes = buf.getvalue()
    base64_str = base64.b64encode(img_bytes).decode('utf-8')
    return base64_str