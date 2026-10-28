#version 450
#extension GL_ARB_separate_shader_objects : enable

layout(set = 0, binding = 0) uniform CameraBufferObject {
    mat4 view;
    mat4 proj;
} camera;

// TODO: Declare fragment shader inputs

layout(location = 0) in vec3 fragNormal;
layout(location = 1) in float fragHeight;
layout(location = 2) in vec3 fragWorldPos;
layout(location = 0) out vec4 outColor;

void main() {
    // TODO: Compute fragment color

    // simple Lambertian lighitng
    vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));

    vec3 N = normalize(fragNormal);
    vec3 L = lightDir;

    // diffuse (lambert)
    float diffuse = max(dot(N, L), 0.0);

    // fake subsurface scattering 
    float backLight = max(dot(-N, L), 0.0);
    float translucency = pow(backLight, 3.0) * 1.5;

    // ambient occulsion 
    float ao = mix(0.2, 1.0, fragHeight);

    // colors for root & tip
    vec3 rootColor = vec3(0.02, 0.08, 0.02);
    vec3 tipColor = vec3(0.15, 0.45, 0.1);
    vec3 baseColor = mix(rootColor, tipColor, fragHeight);

    // combine
    vec3 ambient = baseColor * 0.15;
    vec3 finalColor = ambient + (baseColor * diffuse * ao) + (tipColor * translucency);

    // gamma correction
    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    outColor = vec4(finalColor, 1.0);
}
