// Animated starfield with shooting stars background
(function() {
  const canvas = document.getElementById('stars-bg');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Resize canvas to full screen
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  
  // Stars array
  const stars = [];
  const numStars = 150;
  
  // Create stars with different colors
  const starColors = [
    '255, 255, 255',  // White
    '255, 255, 200',  // Warm white
    '200, 220, 255',  // Cool white
    '255, 200, 150',  // Orange tint
    '150, 200, 255'   // Blue tint
  ];
  
  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.3 + 0.05,
      brightness: Math.random(),
      twinkleSpeed: Math.random() * 0.015 + 0.005,
      color: starColors[Math.floor(Math.random() * starColors.length)]
    });
  }
  
  // Shooting stars array
  const shootingStars = [];
  
  // Create shooting star
  function createShootingStar() {
    if (shootingStars.length < 2 && Math.random() < 0.008) {
      shootingStars.push({
        x: Math.random() * canvas.width * 0.8,
        y: 0,
        length: Math.random() * 100 + 60,
        speed: Math.random() * 12 + 10,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
        opacity: 1
      });
    }
  }
  
  // Animation loop
  function animate() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw and update stars
    stars.forEach(star => {
      // Twinkle effect
      star.brightness += star.twinkleSpeed;
      if (star.brightness > 1 || star.brightness < 0.2) {
        star.twinkleSpeed *= -1;
      }
      
      // Draw star
      const alpha = star.brightness;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${star.color}, ${alpha})`;
      ctx.fill();
      
      // Add glow for larger stars
      if (star.size > 1.3) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color}, ${alpha * 0.15})`;
        ctx.fill();
      }
      
      // Move star slowly downward
      star.y += star.speed;
      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }
    });
    
    // Create new shooting stars
    createShootingStar();
    
    // Draw shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      
      // Draw shooting star trail
      const gradient = ctx.createLinearGradient(
        ss.x, ss.y,
        ss.x - Math.cos(ss.angle) * ss.length,
        ss.y - Math.sin(ss.angle) * ss.length
      );
      
      gradient.addColorStop(0, `rgba(255, 255, 255, ${ss.opacity})`);
      gradient.addColorStop(0.2, `rgba(255, 255, 200, ${ss.opacity * 0.8})`);
      gradient.addColorStop(1, `rgba(255, 200, 100, 0)`);
      
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(
        ss.x - Math.cos(ss.angle) * ss.length,
        ss.y - Math.sin(ss.angle) * ss.length
      );
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw bright head
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${ss.opacity})`;
      ctx.fill();
      
      // Glow effect
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 200, ${ss.opacity * 0.4})`;
      ctx.fill();
      
      // Update position
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.opacity -= 0.006;
      
      // Remove if off screen or faded
      if (ss.y > canvas.height || ss.x > canvas.width || ss.opacity <= 0) {
        shootingStars.splice(i, 1);
      }
    }
    
    requestAnimationFrame(animate);
  }
  
  // Start animation
  animate();
})();
