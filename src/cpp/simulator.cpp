#include <iostream>
#include <emscripten/val.h>
#include <emscripten/bind.h>
#include <Eigen/Dense>
#include <Eigen/Sparse>
#include <igl/min_quad_with_fixed.h>
#include <igl/cotmatrix.h>
#include <igl/polar_svd3x3.h>
class Simulator{
public:
    Simulator(){}
    ~Simulator(){}

    void Initialize(emscripten::val V_js, emscripten::val F_js, emscripten::val b_js){
        std::vector<float> V_arr = emscripten::convertJSArrayToNumberVector<float>(V_js);
        std::vector<int> F_arr = emscripten::convertJSArrayToNumberVector<int>(F_js);
        std::vector<int> b_arr = emscripten::convertJSArrayToNumberVector<int>(b_js);

        Eigen::Map<Eigen::Matrix<float, -1, -1, Eigen::RowMajor>> V(V_arr.data(), V_arr.size()/3, 3);
        Eigen::Map<Eigen::Matrix<int, -1, -1, Eigen::RowMajor>> F_raw(F_arr.data(), F_arr.size()/4, 4);
        Eigen::Matrix<int, -1, -1, Eigen::RowMajor> F = F_raw(Eigen::placeholders::all, {1,2,3});
        Eigen::Map<Eigen::VectorXi> b(b_arr.data(), b_arr.size());

        // cot matrix	
		Eigen::SparseMatrix<float> L;  
		igl::cotmatrix(V,F,L);

		Eigen::SparseMatrix<float> Aeq;
		igl::min_quad_with_fixed_precompute(L,b,Aeq,false,m_arap_data);

		Eigen::MatrixXf CE;
		igl::cotmatrix_entries(V, F, CE);

        // Build K
		m_arap_K.resize(V.rows(),3*V.rows());
		
		typedef Eigen::Triplet<float> T;
		std::vector<T> tripletList;
		tripletList.reserve(F.rows()*3*6);

        
		for (int f=0; f<F.rows(); f++){
            for (int v=0; v<3; v++){
            // for triangle meshes
            int i = F(f, (v + 1)%3);
            int j = F(f, (v + 2)%3);
            // cot_v corresponds to the opposi₩te half edge
        
            Eigen::Vector3f eij = CE(f,v) * (V.row(i) - V.row(j));
            eij = eij/3.0;
        
            for(int k=0; k<3; k++){
                for(int t=0; t<3; t++){
                    tripletList.push_back(T(i, 3*F(f,k) + t, eij(t)));
                    tripletList.push_back(T(j, 3*F(f,k) + t, -eij(t)));
                    }
                }      
            }
        }
        
        m_arap_K.setFromTriplets(tripletList.begin(), tripletList.end());
    }

    emscripten::val SingleIteration(emscripten::val CU_js, emscripten::val V_js){
        std::vector<float> V_arr = emscripten::convertJSArrayToNumberVector<float>(V_js);
        std::vector<float> CU_arr = emscripten::convertJSArrayToNumberVector<float>(CU_js);

        Eigen::Map<Eigen::Matrix<float, -1, -1, Eigen::RowMajor>> V(V_arr.data(), V_arr.size()/3, 3);
        Eigen::Map<Eigen::Matrix<float, -1, -1, Eigen::RowMajor>> CU(CU_arr.data(), CU_arr.size()/3, 3);

        Eigen::MatrixXf C = m_arap_K.transpose() * V;

        Eigen::MatrixXf R(3*m_arap_data.n, 3);
		for (int k=0; k<m_arap_data.n; k++){
			Eigen::Matrix3f Rk;
			Eigen::Matrix3f Ck = C.block(k*3, 0, 3, 3);
			igl::polar_svd3x3(Ck, Rk);
			R.block(k*3, 0, 3, 3) = Rk;    
	  	}

        // from min_quad_with_fixed_solve code
		Eigen::VectorXf Beq;
		Eigen::MatrixXf B = m_arap_K*R;

        // Solve
        U = V;		
		igl::min_quad_with_fixed_solve(m_arap_data, B, CU, Beq, U);

        // Return in float32Array
        return emscripten::val(emscripten::typed_memory_view(U.size(), U.data()));
    }

private:
    igl::min_quad_with_fixed_data<float> m_arap_data;
	Eigen::SparseMatrix<float> m_arap_K;
    Eigen::Matrix<float, -1, -1, Eigen::RowMajor> U;	
};

EMSCRIPTEN_BINDINGS(my_module) {
    emscripten::class_<Simulator>("Simulator")
        .constructor<>()
        .function("Initialize", &Simulator::Initialize)
        .function("SingleIteration", &Simulator::SingleIteration);
}