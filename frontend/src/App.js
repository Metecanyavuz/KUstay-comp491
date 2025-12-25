import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation/Navigation';
import HomePage from './components/HomePage/HomePage';
import ListingsPage from './components/ListingsPage/ListingsPage';
import ListingDetail from './components/ListingDetail/ListingDetail';
import CreateListing from './components/CreateListing/CreateListing';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import ForgotPassword from './components/ForgotPassword/ForgotPassword';
import ResetPassword from './components/ResetPassword/ResetPassword';
import VerifyEmail from './components/VerifyEmail/VerifyEmail';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import Matches from './components/Matches/Matches';
import Profile from './components/Profile/Profile';
import UserProfile from './components/UserProfile/UserProfile';
import Messages from './components/Messages/Messages';
import MapView from './components/MapView/MapView';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/listings/:listingId" element={<ListingDetail />} />
            <Route path="/map" element={<MapView />} />
            <Route
              path="/listings/new"
              element={
                <PrivateRoute>
                  <CreateListing />
                </PrivateRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route 
              path="/matches" 
              element={
                <PrivateRoute>
                  <Matches />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
             } 
            />
            <Route 
              path="/profile/:userId" 
              element={<UserProfile />} 
            />
            <Route
              path="/conversations"
              element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
