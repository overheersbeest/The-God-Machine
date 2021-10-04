import os
import sys
add_path_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
test_path = add_path_base + '\\tests' 
portfolio_path = add_path_base + '\\GodMachine' 
sys.path.append(test_path) 
sys.path.append(portfolio_path)