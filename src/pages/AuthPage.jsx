import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosSetup';
import { useAuth } from '../context/AuthContext'; // Import the context

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { login } = useAuth(); // Destructure login function from context

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        // LOGIN
        const res = await api.post('/auth/login', { 
          email: formData.email, 
          password: formData.password 
        });
        
        // Save user data to AuthContext
        login(res.data.user); 
        navigate('/'); 
      } else {
        // SIGNUP
        await api.post('/auth/register', formData);
        
        // After signup, switch to login view so they can sign in
        setIsLogin(true);
        alert("Account created successfully! Please log in.");
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h2>{isLogin ? 'Welcome Back' : 'Create an Account'}</h2>
      
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Name and Role appear only on Sign Up */}
        {!isLogin && (
          <>
            <input 
              type="text" name="name" placeholder="Full Name" required 
              value={formData.name} onChange={handleChange}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            
            <label style={{ fontSize: '14px', marginBottom: '-10px' }}>Select Role:</label>
            <select 
              name="role" 
              value={formData.role} 
              onChange={handleChange}
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </>
        )}

        <input 
          type="email" name="email" placeholder="Email Address" required 
          value={formData.email} onChange={handleChange}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        <input 
          type="password" name="password" placeholder="Password" required 
          value={formData.password} onChange={handleChange}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        <button type="submit" style={{ padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>
          {isLogin ? 'Log In' : 'Sign Up'}
        </button>
      </form>

      <p style={{ marginTop: '20px', cursor: 'pointer', color: '#3b82f6' }} onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Don't have an account? Sign up." : "Already have an account? Log in."}
      </p>
    </div>
  );
};

export default AuthPage;