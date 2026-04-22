/**
 * Conversione immagini PNG/JPG in formato ZPL ^GFA per stampanti Zebra
 * Supporta ridimensionamento automatico e dithering per stampa monocromatica
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Converte un file immagine in comando ZPL ^GFA
 * @param {string} imagePath - Path del file immagine
 * @param {number} maxWidth - Larghezza massima in dots (default: 80 per ~10mm)
 * @param {number} maxHeight - Altezza massima in dots (default: 60 per ~7.5mm)
 * @returns {object} { zplCommand, width, height, success }
 */
function imageToZPL(imagePath, maxWidth = 80, maxHeight = 60) {
  try {
    // Use Python/Pillow for image processing
    const pythonScript = `
import sys, json
from PIL import Image

img = Image.open('${imagePath.replace(/'/g, "\\'")}')

# Convert to grayscale then to 1-bit (black/white)
img = img.convert('L')

# Resize maintaining aspect ratio
w, h = img.size
ratio = min(${maxWidth}/w, ${maxHeight}/h)
new_w = int(w * ratio)
new_h = int(h * ratio)

# Width must be multiple of 8 for ZPL
new_w = (new_w + 7) // 8 * 8
img = img.resize((new_w, new_h), Image.LANCZOS)

# Convert to 1-bit with threshold
img = img.point(lambda x: 0 if x < 128 else 255, '1')

# Generate ZPL hex data
# In ZPL: 1 = white, 0 = black (inverted from normal)
bytes_per_row = new_w // 8
total_bytes = bytes_per_row * new_h
hex_data = ''

for y in range(new_h):
    row_hex = ''
    for x_byte in range(bytes_per_row):
        byte_val = 0
        for bit in range(8):
            px = x_byte * 8 + bit
            if px < new_w:
                pixel = img.getpixel((px, y))
                if pixel == 0:  # black pixel
                    byte_val |= (1 << (7 - bit))
        row_hex += format(byte_val, '02X')
    hex_data += row_hex

result = {
    'success': True,
    'width': new_w,
    'height': new_h,
    'bytesPerRow': bytes_per_row,
    'totalBytes': total_bytes,
    'hexData': hex_data
}
print(json.dumps(result))
`;

    const result = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000
    });

    const data = JSON.parse(result.trim());

    if (data.success) {
      // Format: ^GFA,<total bytes>,<total bytes>,<bytes per row>,<hex data>
      const zplCommand = `^GFA,${data.totalBytes},${data.totalBytes},${data.bytesPerRow},${data.hexData}`;
      return {
        success: true,
        zplCommand,
        width: data.width,
        height: data.height
      };
    }

    return { success: false, error: 'Conversione fallita' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Versione semplificata: converte un Buffer immagine in ZPL
 */
function bufferToZPL(buffer, maxWidth = 80, maxHeight = 60) {
  const tmpPath = path.join(__dirname, 'tmp_logo_' + Date.now() + '.png');
  try {
    fs.writeFileSync(tmpPath, buffer);
    const result = imageToZPL(tmpPath, maxWidth, maxHeight);
    return result;
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}

module.exports = { imageToZPL, bufferToZPL };
