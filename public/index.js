//giriş sayfası
document.getElementById("showSignUp").addEventListener("click", function() {
    document.getElementById("signupContainer").style.display = "block";
    document.getElementById("loginForm").parentElement.style.display = "none";
  });
  
  document.getElementById("showLogin").addEventListener("click", function() {
    document.getElementById("signupContainer").style.display = "none";
    document.getElementById("loginForm").parentElement.style.display = "block";
  });


// Giriş işlemi
document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  
  fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      window.location.href = '/dashboard.html';  // Giriş başarılıysa ana sayfaya yönlendir
    } else {
      alert(data.message);  // Hata mesajını göster
    }
  });
});
  
  // Üye olma işlemi
  document.getElementById("signupForm").addEventListener("submit", function(e) {
    e.preventDefault();
    
    const username = document.getElementById("signupUsername").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    
    fetch('/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    })
    .then(res => res.text())
    .then(data => alert(data));
  });