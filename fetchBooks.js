const mysql = require('mysql2');
const axios = require('axios');

// MySQL veritabanı bağlantısı
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'mehmet123', // Kendi şifrenizle değiştirin
    database: 'library'
});

db.connect(err => {
    if (err) {
        console.error('MySQL bağlantı hatası:', err);
        return;
    }
    console.log('MySQL bağlantısı sağlandı.');
});

// Google Books API'sinden veri çekme
const fetchBooksFromAPI = async (startIndex = 0, totalBooks = 100) => {
    const maxResults = 40; // Her API isteğinde alınacak maksimum sonuç sayısı
    let fetchedBooks = 0;

    while (fetchedBooks < totalBooks) {
        try {
            const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
                params: {
                    q: 'subject:fiction',
                    startIndex,
                    maxResults,
                    langRestrict: 'tr'
                }
            });
            const books = response.data.items;

            for (const book of books) {
                const title = book.volumeInfo.title;
                const author = book.volumeInfo.authors ? book.volumeInfo.authors[0] : 'Unknown Author';

                // Kitabın zaten mevcut olup olmadığını kontrol et
                const [rows] = await db.promise().query('SELECT COUNT(*) as count FROM books WHERE title = ? AND author = ?', [title, author]);

                if (rows[0].count === 0) {
                    // Veritabanına ekleme
                    db.query('INSERT INTO books (title, author, status) VALUES (?, ?, ?)', [title, author, 'available'], (err, results) => {
                        if (err) {
                            console.error('MySQL INSERT hatası:', err);
                            return;
                        }
                        console.log(`Kitap eklendi: ${title} - ${author}`);
                    });
                } else {
                    console.log(`Kitap zaten mevcut: ${title} - ${author}`);
                }
            }

            fetchedBooks += books.length;
            startIndex += maxResults;
        } catch (error) {
            console.error('API hatası:', error);
            break;
        }
    }

    db.end();
};

fetchBooksFromAPI();
