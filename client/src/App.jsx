import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import './App.css'
import OrdersList from "./OrdersList";
import OrderDetails from './OrderDetails';
import OrderNew from './OrderNew';
function App() {
  

  return (
    <>
      <h1>Courier Network System</h1>
      <Router>
        <Routes>
          <Route path="/orders" element={<OrdersList/>}></Route>
          <Route path="/orders/:id" element={<OrderDetails/>}></Route>
          <Route path="/orders/new" element={<OrderNew/>}></Route>
        </Routes>
      </Router>
    </>
  )
}

export default App
