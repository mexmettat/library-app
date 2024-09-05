const express = require('express');
const mysql = require('mysql2');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

/// Giriş işlemi
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        bcrypt.compare(password, result[0].password, (err, isMatch) => {
          if (isMatch) {
            res.json({ success: true, message: 'Giriş başarılı' });
          } else {
            res.json({ success: false, message: 'Yanlış şifre' });
          }
        });
      } else {
        res.json({ success: false, message: 'Kullanıcı bulunamadı' });
      }
    });
  });
  
  // Üye olma işlemi
  app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) throw err;
      db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
        [username, email, hash], (err, result) => {
          if (err) throw err;
          res.send('Üyelik başarılı');
        });
    });
  });

// MySQL veritabanı bağlantısı
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'mehmet123',
    database: 'library'
});

db.connect(err => {
    if (err) {
        console.error('MySQL bağlantı hatası:', err);
        return;
    }
    console.log('MySQL bağlantısı sağlandı.');
});

// Kitapları listeleme
app.get('/books', (req, res) => {
    db.query('SELECT * FROM books', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Yeni kitap ekleme
app.post('/books', (req, res) => {
    const { title, author } = req.body;
    if (!title || !author) {
        return res.status(400).json({ error: 'Başlık ve yazar zorunludur.' });
    }

    db.query('INSERT INTO books (title, author, status) VALUES (?, ?, ?)', [title, author, 'available'], (err, results) => {
        if (err) {
            console.error('MySQL INSERT hatası:', err);
            return res.status(500).json({ error: err.message });
        }

        // WebSocket ile bildirim gönder
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'newBook',
                    book: { id: results.insertId, title, author, status: 'available' },
                    message: `Yeni kitap eklendi: ${title} - ${author}`
                }));
            }
        });

        res.status(201).json({ id: results.insertId, title, author, status: 'available' });
    });
});

// Kitap güncelleme
app.put('/books/:id', (req, res) => {
    const id = req.params.id;
    const { title, author, status } = req.body;

    db.query('UPDATE books SET title = ?, author = ?, status = ? WHERE id = ?', [title, author, status, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // WebSocket ile bildirim gönder
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'updateBook',
                    book: { id, title, author, status },
                    message: `Kitap güncellendi: ${title} - ${author}`
                }));
            }
        });

        res.json({ id, title, author, status });
    });
});

// Kitap silme
app.delete('/books/:id', (req, res) => {
    const id = req.params.id;

    db.query('SELECT * FROM books WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Kitap bulunamadı' });

        const book = results[0];

        db.query('DELETE FROM books WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // WebSocket ile bildirim gönder
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'deleteBook',
                        id,
                        book,
                        message: `Kitap silindi: ${book.title}`
                    }));
                }
            });

            res.send(`Kitap silindi: ${book.title}`);
        });
    });
});

// Kitap ödünç alma
app.post('/borrow', (req, res) => {
    const { bookId } = req.body;

    db.query('UPDATE books SET status = ? WHERE id = ?', ['borrowed', bookId], (err) => {
        if (err) return res.status(500).send('Kitap ödünç alınırken bir hata oluştu.');

        res.send(`Kitap ödünç alındı: ID ${bookId}`);
    });
});

// WebSocket sunucusu
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', ws => {
    console.log('Yeni bir WebSocket bağlantısı kuruldu.');
    ws.on('message', message => {
        console.log('WebSocket mesajı:', message);
    });
});

// Express ve WebSocket sunucularını aynı portta çalıştır
const server = app.listen(3000, () => {
    console.log('Sunucu http://localhost:3000 adresinde çalışıyor.');
});

// WebSocket sunucusunu HTTP sunucusuna bağla
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
    });
});
