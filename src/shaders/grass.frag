#version 450
#extension GL_ARB_separate_shader_objects : enable

layout(set = 0, binding = 0) uniform CameraBufferObject {
    mat4 view;
    mat4 proj;
} camera;

// TODO: Declare fragment shader inputs

layout(location = 0) in vec3 fragNormal;
layout(location = 1) in float fragHeight;
layout(location = 0) out vec4 outColor;

void main() {
    // TODO: Compute fragment color

    // simple Lambertian lighitng
    vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
    float diff = max(dot(normalize(fragNormal), lightDir), 0.2);

    // fake subsurface scattering 
    vec3 viewDir = normalize(vec3(0.0, 1.0, 5.0) - vec3(0.0));
    float scatter = max(dot(-lightDir, viewDir), 0.0);
    diff += scatter * 0.2;

    // colors for root & tip
    vec3 rootColor = vec3(0.02, 0.15, 0.05);
    vec3 tipColor = vec3(0.3, 0.6, 0.15);

    // interpolate based on height
    vec3 baseColor = mix(rootColor, tipColor, fragHeight);

    vec3 finalColor = pow(baseColor * (diff + 0.15), vec3(1.0 / 2.2));

    outColor = vec4(finalColor, 1.0);
}
