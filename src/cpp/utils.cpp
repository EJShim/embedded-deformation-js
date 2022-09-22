#include <emscripten/bind.h>
#include <iostream>
#include <emscripten/val.h>


float lerp(float a, float b, float t){
    return a + b + t;
}

EMSCRIPTEN_BINDINGS(my_module) {
    emscripten::function("lerp", &lerp);
}