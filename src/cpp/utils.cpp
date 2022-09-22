#include <iostream>
#include <emscripten/val.h>
#include <emscripten/bind.h>
#include <Eigen/Dense>

void TestEigen(emscripten::val V_js, emscripten::val F_js, emscripten::val b_js){
    std::vector<float> V = emscripten::convertJSArrayToNumberVector<float>(V_js);
    std::vector<int> F = emscripten::convertJSArrayToNumberVector<int>(F_js);
    std::vector<int> b = emscripten::convertJSArrayToNumberVector<int>(b_js);

    std::cout << V.size() << "," << F.size() << "," << b.size() << std::endl;
    
}

EMSCRIPTEN_BINDINGS(my_module) {
    emscripten::function("TestEigen", &TestEigen);
}