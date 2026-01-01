import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import './App.css'
import OrdersList from "./OrdersList";
import OrderDetails from './OrderDetails';
import OrderNew from './OrderNew';
import OrderEdit from './OrderEdit';
import Layout from './layouts/Layout';
function App() {
  

  return (
    <>
      <Router>
        <Routes>
          <Route element={<Layout/>}>
            <Route path="/" element={<Navigate to="/orders"/>}></Route>
            <Route path="/orders" element={<OrdersList/>}></Route>
            <Route path="/orders/:id" element={<OrderDetails/>}></Route>
            <Route path="/orders/new" element={<OrderNew/>}></Route>
            <Route path="/orders/:id/edit" element={<OrderEdit/>}></Route>
          </Route>
        </Routes>
      </Router>
    </>
  )
}

export default App
