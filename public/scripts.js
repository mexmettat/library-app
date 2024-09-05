document.addEventListener('DOMContentLoaded', () => {
    const showAddBookForm = document.getElementById('showAddBookForm');
    const addBookForm = document.getElementById('addBookForm');
    const updateBookForm = document.getElementById('updateBookForm');
    const borrowBookForm = document.getElementById('borrowBookForm');
    const showBookListButton = document.getElementById('showBookList');
    const showBorrowedBooksButton = document.getElementById('showBorrowedBooks');
    const showAllBooksButton = document.getElementById('showAllBooks');
    const bookListContainer = document.getElementById('bookListContainer');
    const recentActionsList = document.getElementById('recentActionsList');
    const notification = document.getElementById('notification');
    const ws = new WebSocket('ws://localhost:3000');

    let updateBookId = null; // Güncellenen kitabın ID'si

    // WebSocket mesajlarını işleme
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'newBook':
                addBookToList(data.book);
                addActionToList(`Yeni kitap eklendi: ${data.book.title} - ${data.book.author}`);
                break;
            case 'updateBook':
                updateBookList(data.book);
                addActionToList(`Kitap güncellendi: ${data.book.title} - ${data.book.author}`);
                break;
            case 'deleteBook':
                const book = bookListContainer.querySelector(`li[data-id="${data.id}"]`);
                if (book) book.remove();
                addActionToList(`Kitap silindi: ${data.book.title}`);
                break;
        }
    };

    // Yeni kitap ekleme formunu göster
    showAddBookForm.addEventListener('click', () => {
        addBookForm.classList.toggle('hidden');
    });

    // Kitapları göster / gizle
    showBookListButton.addEventListener('click', () => {
        bookListContainer.classList.toggle('hidden');
    });

    // Kitap ekleme formunu gönder
    document.getElementById('formAddBook').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('bookTitle').value.trim();
        const author = document.getElementById('bookAuthor').value.trim();

        if (!title || !author) {
            showNotification('Başlık ve yazar zorunludur.');
            return;
        }

        fetch('/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);

            addBookToList(data);
            document.getElementById('bookTitle').value = '';
            document.getElementById('bookAuthor').value = '';
            addBookForm.classList.add('hidden');

            showNotification(`Yeni kitap eklendi: ${data.title} - ${data.author}`);
        })
        .catch(error => showNotification(`Kitap eklenirken bir hata oluştu: ${error.message}`));
    });

    // Kitap arama işlemi
    document.getElementById('searchBooks').addEventListener('input', () => {
        const query = document.getElementById('searchBooks').value.toLowerCase();
        bookListContainer.querySelectorAll('li').forEach(book => {
            book.style.display = book.textContent.toLowerCase().includes(query) ? '' : 'none';
        });
    });

    // Kitap ödünç alma formunu gönder
    document.getElementById('formBorrowBook').addEventListener('submit', (e) => {
        e.preventDefault();
        const bookId = document.getElementById('borrowBookId').value.trim();

        fetch('/borrow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId })
        })
        .then(response => response.text())
        .then(message => {
            showNotification(message);
            addActionToList(`Kitap ödünç alındı: ID ${bookId}`);
        });
    });

    // Kitap güncelleme formunu gönder
    document.getElementById('formUpdateBook').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('updateBookTitle').value.trim();
        const author = document.getElementById('updateBookAuthor').value.trim();
        const status = document.getElementById('updateBookStatus').value;

        if (!title || !author || !status) {
            showNotification('Başlık, yazar ve durum zorunludur.');
            return;
        }

        fetch(`/books/${updateBookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author, status })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);

            updateBookList(data);
            updateBookForm.classList.add('hidden');
            updateBookId = null;

            showNotification(`Kitap güncellendi: ${data.title} - ${data.author}`);
            addActionToList(`Kitap güncellendi: ${data.title} - ${data.author}`);
        })
        .catch(error => showNotification(`Kitap güncellenirken bir hata oluştu: ${error.message}`));
    });

    // Kitap güncelleme formunu göster
    function showUpdateBookForm(bookId, title, author, status) {
        updateBookId = bookId;
        document.getElementById('updateBookTitle').value = title;
        document.getElementById('updateBookAuthor').value = author;
        document.getElementById('updateBookStatus').value = status;
        updateBookForm.classList.remove('hidden');
    }

    // Kitap listesine ekle
    function addBookToList(book) {
        const li = document.createElement('li');
        li.dataset.id = book.id;
        li.innerHTML = `
            ${book.title} - ${book.author}
            <span class="status ${book.status}">${book.status === 'available' ? 'Mevcut' : 'Ödünç Alınmış'}</span>
            <button class="updateBook">Güncelle</button>
            <button class="deleteBook">Sil</button>
        `;
        bookListContainer.appendChild(li);

        // Güncelleme butonuna tıklama olayı
        li.querySelector('.updateBook').addEventListener('click', () => {
            showUpdateBookForm(book.id, book.title, book.author, book.status);
        });

        // Silme butonuna tıklama olayı
        li.querySelector('.deleteBook').addEventListener('click', () => {
            fetch(`/books/${book.id}`, { method: 'DELETE' })
                .then(() => {
                    li.remove();
                    showNotification(`Kitap silindi: ${book.title}`);
                    addActionToList(`Kitap silindi: ${book.title}`);
                });
        });
    }

    // Kitap listesini güncelle
    function updateBookList(book) {
        const li = bookListContainer.querySelector(`li[data-id="${book.id}"]`);
        li.innerHTML = `
            ${book.title} - ${book.author}
            <span class="status ${book.status}">${book.status === 'available' ? 'Mevcut' : 'Ödünç Alınmış'}</span>
            <button class="updateBook">Güncelle</button>
            <button class="deleteBook">Sil</button>
        `;

        // Güncelleme ve silme butonlarına olay ekleme
        li.querySelector('.updateBook').addEventListener('click', () => {
            showUpdateBookForm(book.id, book.title, book.author, book.status);
        });

        li.querySelector('.deleteBook').addEventListener('click', () => {
            fetch(`/books/${book.id}`, { method: 'DELETE' })
                .then(() => {
                    li.remove();
                    showNotification(`Kitap silindi: ${book.title}`);
                    addActionToList(`Kitap silindi: ${book.title}`);
                });
        });
    }

    // Sayfa yüklendiğinde kitapları çek
    fetch('/books')
        .then(response => response.json())
        .then(books => {
            books.forEach(addBookToList);
        });

    // Ödünç alınan kitapları göster
    function showBorrowedBooks() {
        const borrowedBooks = Array.from(bookListContainer.querySelectorAll('li')).filter(book => {
            return book.querySelector('.status').classList.contains('borrowed');
        });

        bookListContainer.innerHTML = ''; // Mevcut kitapları temizle
        borrowedBooks.forEach(book => {
            bookListContainer.appendChild(book.cloneNode(true)); // Yalnızca ödünç alınan kitapları göster
        });
    }

    // Tüm kitapları geri göstermek için fonksiyon
    function showAllBooks() {
        fetch('/books')
            .then(response => response.json())
            .then(books => {
                bookListContainer.innerHTML = ''; // Mevcut kitapları temizle
                books.forEach(addBookToList); // Tüm kitapları listeye ekle
            });
    }

    // Buton tıklama olaylarını ekleyin
    showBorrowedBooksButton.addEventListener('click', showBorrowedBooks);
    showAllBooksButton.addEventListener('click', showAllBooks);

    document.getElementById('logoutButton').addEventListener('click', function() {
        // Çıkış işlemi gerçekleştirme
        // Çıkış yaptıktan sonra kullanıcıyı giriş sayfasına yönlendirme
        window.location.href = 'index.html';
    });
    

    // Bildirim göster
    function showNotification(message) {
        notification.textContent = message;
        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), 5000);
    }

    // Son işlemleri listeye ekle
    function addActionToList(action) {
    // Önce mevcut bildirimleri temizle
    const existingActions = Array.from(recentActionsList.querySelectorAll('li'));
    const duplicate = existingActions.some(item => item.textContent === action);
    
    if (duplicate) return; // Aynı işlem varsa ekleme

    const li = document.createElement('li');
    li.textContent = action;
    recentActionsList.appendChild(li);
}

});
