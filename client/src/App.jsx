import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import './App.css'
import OrdersList from "./OrdersList";
import OrderDetails from './OrderDetails';
import OrderNew from './OrderNew';
import OrderEdit from './OrderEdit';
function App() {
  

  return (
    <>
      <h1>Courier Network System</h1>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/orders"/>}></Route>
          <Route path="/orders" element={<OrdersList/>}></Route>
          <Route path="/orders/:id" element={<OrderDetails/>}></Route>
          <Route path="/orders/new" element={<OrderNew/>}></Route>
          <Route path="/orders/:id/edit" element={<OrderEdit/>}></Route>
        </Routes>
      </Router>
    </>
  )
}

export default App
