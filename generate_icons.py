"""Generate PWA icons for MedGuardian"""
from PIL import Image, ImageDraw, ImageFont
import os

# Icon sizes needed for PWA
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def create_icon(size):
    """Create a simple pill icon"""
    # Create image with gradient-like background
    img = Image.new('RGB', (size, size), '#667eea')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple pill shape
    padding = size // 6
    pill_width = size - (padding * 2)
    pill_height = pill_width // 2
    pill_top = (size - pill_height) // 2
    
    # White pill background
    draw.rounded_rectangle(
        [padding, pill_top, size - padding, pill_top + pill_height],
        radius=pill_height // 2,
        fill='white'
    )
    
    # Dividing line
    mid_x = size // 2
    draw.line([(mid_x, pill_top + 2), (mid_x, pill_top + pill_height - 2)], fill='#667eea', width=max(2, size // 50))
    
    return img

def main():
    output_dir = 'app/static/icons'
    os.makedirs(output_dir, exist_ok=True)
    
    for size in SIZES:
        icon = create_icon(size)
        icon.save(f'{output_dir}/icon-{size}.png', 'PNG')
        print(f'Created icon-{size}.png')
    
    print('All icons generated!')

if __name__ == '__main__':
    main()
