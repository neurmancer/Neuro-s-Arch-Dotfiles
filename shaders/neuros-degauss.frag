#version 300 es

// A brief CRT degaussing burst. This shader is selected by the helper script
// for less than a second, then Hyprland reloads the user's normal CRT state.
precision highp float;

in vec2 v_texcoord;
layout(location = 0) out vec4 fragColor;

uniform sampler2D tex;

void main() {
    vec2 resolution = vec2(textureSize(tex, 0));
    vec2 pixel = 1.0 / max(resolution, vec2(1.0));
    vec2 centered = v_texcoord * 2.0 - 1.0;
    float radius = length(centered);
    float angle = atan(centered.y, centered.x);
    float falloff = smoothstep(1.05, 0.0, radius);

    // Rotating-looking concentric magnetic fields and a slight radial pull.
    // It is static by design: Hyprland does not pass a time uniform to screen
    // shaders, and this effect remains visible only for a short burst.
    float coils = sin(radius * 44.0 - angle * 7.0);
    vec2 direction = vec2(cos(angle + coils * 1.8), sin(angle + coils * 1.8));
    vec2 warp = direction * pixel * (3.0 + 9.0 * abs(coils)) * falloff;
    vec2 uv = clamp(v_texcoord + warp, vec2(0.0), vec2(1.0));

    float chroma = pixel.x * (5.0 + 10.0 * abs(coils)) * falloff;
    vec3 color;
    color.r = texture(tex, clamp(uv + direction * chroma, vec2(0.0), vec2(1.0))).r;
    color.g = texture(tex, uv).g;
    color.b = texture(tex, clamp(uv - direction * chroma, vec2(0.0), vec2(1.0))).b;

    float rings = 0.90 + 0.10 * sin(radius * 92.0 + angle * 13.0);
    float tint = 0.06 * falloff * (0.5 + 0.5 * coils);
    color *= rings;
    color += vec3(tint, -tint * 0.25, tint * 0.8);
    fragColor = vec4(max(color, vec3(0.0)), 1.0);
}
