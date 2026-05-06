import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const nodes = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 150, 80, 0.8)';
        ctx.fill();
      });

      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach(b => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(180, 150, 80, ${0.15 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(draw);
    };

    draw();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', form);
      login(res.data.token, res.data.user);
      navigate('/mindspace');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.overlay} />
      <div style={styles.box}>
        <p style={styles.eyebrow}>INITIALIZE YOUR UNIVERSE</p>
        <h1 style={styles.title}>JARVIS—I</h1>
        <p style={styles.quote}>"The mind is infinite. Give it a home."</p>
        <div style={styles.divider} />
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="text"
            placeholder="Your Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            style={styles.input}
            type="email"
            placeholder="Identity"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Passphrase"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
          <button style={styles.button} type="submit">
            INITIALIZE SYSTEM
          </button>
        </form>
        <p style={styles.link}>
          Already initialized? <Link to="/login" style={styles.linkAccent}>Access MindSpace</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    background: '#080c14',
  },
  canvas: {
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(ellipse at center, rgba(8,12,20,0.4) 0%, rgba(8,12,20,0.85) 100%)',
    zIndex: 1,
  },
  box: {
    position: 'relative',
    zIndex: 2,
    background: 'rgba(10, 14, 24, 0.85)',
    border: '1px solid rgba(180, 150, 80, 0.25)',
    borderRadius: '4px',
    padding: '52px 48px',
    width: '420px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 0 60px rgba(180, 150, 80, 0.08), inset 0 0 60px rgba(0,0,0,0.3)',
  },
  eyebrow: {
    color: 'rgba(180, 150, 80, 0.6)',
    fontSize: '10px',
    letterSpacing: '4px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '42px',
    color: '#b49650',
    textAlign: 'center',
    letterSpacing: '12px',
    fontWeight: '300',
    textShadow: '0 0 30px rgba(180, 150, 80, 0.4)',
    marginBottom: '12px',
    fontFamily: 'Georgia, serif',
  },
  quote: {
    color: 'rgba(180, 150, 80, 0.45)',
    textAlign: 'center',
    fontSize: '11px',
    fontStyle: 'italic',
    letterSpacing: '1px',
    marginBottom: '24px',
    fontFamily: 'Georgia, serif',
  },
  divider: {
    width: '40px',
    height: '1px',
    background: 'rgba(180, 150, 80, 0.4)',
    margin: '0 auto 28px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    marginBottom: '14px',
    background: 'rgba(180, 150, 80, 0.04)',
    border: '1px solid rgba(180, 150, 80, 0.2)',
    borderRadius: '2px',
    color: '#c8b98a',
    fontSize: '13px',
    outline: 'none',
    letterSpacing: '2px',
    fontFamily: 'Courier New, monospace',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'transparent',
    border: '1px solid rgba(180, 150, 80, 0.5)',
    borderRadius: '2px',
    color: '#b49650',
    fontSize: '11px',
    letterSpacing: '4px',
    cursor: 'pointer',
    marginTop: '8px',
    fontFamily: 'Courier New, monospace',
  },
  error: {
    color: '#c0392b',
    textAlign: 'center',
    marginBottom: '16px',
    fontSize: '12px',
    letterSpacing: '1px',
  },
  link: {
    color: 'rgba(180, 150, 80, 0.4)',
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '11px',
    letterSpacing: '1px',
  },
  linkAccent: {
    color: '#b49650',
    textDecoration: 'none',
  },
};