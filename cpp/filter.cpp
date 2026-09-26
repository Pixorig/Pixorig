#include <emscripten/emscripten.h>
#include <cstdint>
#include <algorithm>

/**
 * C++ WASM Image Processing Core cho Pixorig
 * Biên dịch bằng Emscripten (emcc) ra WebAssembly
 */

extern "C" {

/**
 * Chỉnh độ sáng (Brightness)
 * data: RGBA pixel array
 * length: tổng số bytes (width * height * 4)
 * delta: -255 đến 255
 */
EMSCRIPTEN_KEEPALIVE
void adjust_brightness(uint8_t* data, int length, int delta) {
    for (int i = 0; i < length; i += 4) {
        data[i]     = std::clamp(data[i]     + delta, 0, 255); // R
        data[i + 1] = std::clamp(data[i + 1] + delta, 0, 255); // G
        data[i + 2] = std::clamp(data[i + 2] + delta, 0, 255); // B
        // Alpha data[i + 3] giữ nguyên
    }
}

/**
 * Biến ảnh thành đen trắng (Grayscale) tốc độ cao
 */
EMSCRIPTEN_KEEPALIVE
void apply_grayscale(uint8_t* data, int length) {
    for (int i = 0; i < length; i += 4) {
        // Luminance công thức chuẩn: 0.299R + 0.587G + 0.114B
        uint8_t gray = static_cast<uint8_t>(
            data[i] * 0.299f + data[i + 1] * 0.587f + data[i + 2] * 0.114f
        );
        data[i]     = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
}

/**
 * Đảo màu (Invert)
 */
EMSCRIPTEN_KEEPALIVE
void apply_invert(uint8_t* data, int length) {
    for (int i = 0; i < length; i += 4) {
        data[i]     = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
    }
}

}
