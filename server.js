const express = require('express');
const { Client } = require('pg');
const path = require('path');
const bodyParser = require("body-parser");
const axios = require('axios');
const fetch = require('node-fetch');
// const { v4: uuidv4 } = require('uuid'); 

const app = express();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//
const session = require('express-session');

app.use(session({
  secret: 'mysecret', 
  resave: false,
  saveUninitialized: true
}));
//

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//method Override
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// Configure storage
const multer = require('multer');

const storage = multer.diskStorage({
  destination: './public/img', 
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage });

// Serve static files (so users can access uploaded images)
app.use('/uploads', express.static('uploads'));

//
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

app.use(cookieParser());

const JWT_SECRET = 'mySecretKey123'; 


//
const con = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "safaa2002",
  database: "coffee_store"
});

con.connect().then(async () => {
  console.log("pg connected");
});

 
// app.get('/', async (req, res) => {
//     try {
//         const result = await con.query('SELECT * FROM items');
//         res.render('login', { items: result.rows });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });
app.get('/', async (req, res) => {
  try {
    const result = await con.query('SELECT * FROM items');

    const response = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=31.9552&longitude=35.945&hourly=temperature_2m&forecast_days=1');
    const { time, temperature_2m } = response.data.hourly;
    const hour = new Date().getHours();
    const temperatureNow = temperature_2m[hour];

    const adviceResponse = await axios.get('https://api.adviceslip.com/advice');
    const advice = adviceResponse.data.slip.advice;

    res.render('login', {
      items: result.rows,
      temperatureNow,
      advice
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// customer page
app.get('/customer', async (req, res) => {
  const result = await con.query('SELECT * FROM items');
  res.render('project', { items: result.rows });
});

//
app.get('/adminPage',authenticateToken, async (req, res) => {
  const role = req.session.role;
  if (!role) return res.redirect('/'); // لو ما سجل دخول

  try {
    const result = await con.query('SELECT * FROM items');
    res.render('adminPage', { items: result.rows, role: req.user.role });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

//s.a page

// app.get('/superAdmin', async (req, res) => {
//   const result = await con.query('SELECT * FROM items');
//   res.render('superAdmin', { items: result.rows });
// });

// n.a page
// app.get('/normalAdmin', async (req, res) => {
//   const result = await con.query('SELECT * FROM items');
//   res.render('normalAdmin', { items: result.rows });
// });

//add item in s.a
// app.get('/addItem', async (req, res) => {
//     try {
//         const result = await con.query('SELECT * FROM items');
//         res.render('superAdmin', { items: result.rows });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });
// app.post('/addItem', upload.single('image'), async(req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).send('No image uploaded.');
//     }

//     const name = req.body.name;
//     const price = req.body.price;
//     const image = `/img/${req.file.filename}`; 

//     await con.query(
//       'INSERT INTO items (name, price, image) VALUES ($1, $2, $3)',
//       [name, price, image]
//     );

//     res.redirect('/superAdmin');

//     // res.render('superAdmin'); 
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// });

// // add item in n.a 
// app.get('/addItems', async (req, res) => {
//   try {
//       const result = await con.query('SELECT * FROM items');
//       res.render('normalAdmin', { items: result.rows });
//   } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//   }
// });
// app.post('/addItems', upload.single('image'), async(req, res) => {
// try {
//   if (!req.file) {
//     return res.status(400).send('No image uploaded.');
//   }

//   const name = req.body.name;
//   const price = req.body.price;
//   const image = `/img/${req.file.filename}`; 

//   await con.query(
//     'INSERT INTO items (name, price, image) VALUES ($1, $2, $3)',
//     [name, price, image]
//   );

//   res.redirect('/normalAdmin');

//   // res.render('normalAdmin'); 
// } catch (err) {
//   console.error(err);
//   res.status(500).send('Server Error');
// }
// });

// // delete item in s.a page
// app.delete('/deleteItem/:id', async (req, res) => {
//     const { id } = req.params;
//     try {
//         await con.query('DELETE FROM items WHERE id = $1', [id]);
//         res.status(200).send('Item deleted');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

//add items in s , n

app.post('/addItem', upload.single('image'), async (req, res) => {
  const role = req.session.role;
  if (!role) return res.redirect('/');

  try {
    if (!req.file) {
      return res.status(400).send('No image uploaded.');
    }

    const { name, price } = req.body;
    const image = `/img/${req.file.filename}`;

    await con.query(
      'INSERT INTO items (name, price, image) VALUES ($1, $2, $3)',
      [name, price, image]
    );

    res.redirect('/adminPage');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

//delete user in s.a page
app.post('/deleteItem/:id', async (req, res) => {
  const role = req.session.role;
  if (role !== 'superadmin') return res.status(403).send('Access denied');

  const { id } = req.params;
  try {
    await con.query('DELETE FROM items WHERE id = $1', [id]);
    res.redirect('/adminPage');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

//add  normal admin in s.a
app.post('/addAdmin',authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  try {
    await con.query('INSERT INTO users (name, email, role) VALUES ($1, $2, $3)', [name, email, 'admin']);
    res.redirect('/adminControl');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding admin');
  }
});

// Delete normal admin in s.a
app.delete('/deleteAdmin/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await con.query('DELETE FROM users WHERE id = $1 AND role = $2', [id, 'admin']);
    res.redirect('/adminControl');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting admin');
  }
});


//راوت  برسل الداتا من الداتا بيس
app.get('/items', async (req, res) => {
    try {
        const result = await con.query('SELECT * FROM items');
        res.json(result.rows);
        // res.render("AdminPageOrders", { orders: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
  
//view orders
app.get("/orders", async (req, res) => {
    try {
      const result = await con.query("SELECT * FROM orders");
      res.render("AdminPageOrders", { orders: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching orders");
    }
  });
  
  app.get("/page2", (req, res) => {
    res.render("page2"); 
  });
  app.get("/page3", (req, res) => {
    res.render("page3");
  });
  app.get("/cart", (req, res) => {
    res.render("cart"); // cart.ejs
  });



//view adminContro Page to manage n.admins 
app.get('/adminControl', authenticateToken,async (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.send(`
      <html>
        <head>
          <title>Access Denied</title>
          <meta charset="UTF-8" />
        </head>
          <h1>Access Denied</h1>
          <script>
            setTimeout(function () {
              window.location.href = "/AdminPage";
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }
  try {

    const result = await con.query("SELECT * FROM users WHERE role = 'admin'");
    res.render('adminControl', { admins: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading admins');
  }
});


// login
// app.post('/login', async (req, res) => {
//   const { name, email } = req.body;
//   try {
//     const result = await con.query('SELECT * FROM users WHERE name = $1 AND email = $2', [name, email]);
//     if (result.rows.length > 0) {
//       const user = result.rows[0];
//       req.session.role = user.role; 
//       res.redirect('/adminPage');
//     } else {
//       res.send('User not found');
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Login error');
//   }
// });

app.post('/login', async (req, res) => {
  const { name, email } = req.body;
  const result = await con.query('SELECT * FROM users WHERE name = $1 AND email = $2', [name, email]);

  if (result.rows.length > 0) {
    const user = result.rows[0];

    const token = jwt.sign({ name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, { httpOnly: true });

    req.session.role = user.role; 
    res.redirect('/adminPage');
  } else {
    res.send('User not found');
  }
});

//
function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user; 
    next();
  } catch (err) {
    res.redirect('/login');
  }
}

//
app.post("/add-order", async (req, res) => {
  const { name, phone, payment, productName, productPrice } = req.body;

  await con.query(
    "INSERT INTO orders (customer_name, customer_phone, payment_method, product_name, product_price) VALUES ($1, $2, $3, $4, $5)",
    [name, phone, payment, productName, productPrice]
  );

  // ✅ تم تعديل quantity إلى stock
  await con.query(
    "UPDATE items SET stock = stock - 1 WHERE name = $1 AND stock > 0",
    [productName]
  );

  res.sendStatus(200);
});


app.post('/submit-order', async (req, res) => {
  const { name, email, phone, payment, cartItems, totalPrice } = req.body;

  try {
    const result = await con.query("SELECT MAX(order_id) FROM orders");
    const newOrderId = (result.rows[0].max || 0) + 1;

    for (const item of cartItems) {
      const itemTotal = item.product_price * item.quantity;

      await con.query(
        'INSERT INTO orders (customer_name, email, phone, payment, item_name, quantity, price, total_price, order_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [name, email, phone, payment, item.product_name, item.quantity, item.product_price, itemTotal, newOrderId]
      );

      // خصم الكمية من المخزون
      // await con.query(
      //   'UPDATE items SET stock = stock - $1 WHERE name = $2 AND stock >= $1',
      //   [item.quantity, item.name]
      // );
      const update = await con.query(
        'UPDATE items SET stock = stock - $1 WHERE name = $2 AND stock >= $1',
        [item.quantity, item.product_name]
      );
      console.log("Updated stock rows:", update.rowCount);
      // console.log("Updated stock rows:", update.rowCount);
    }

    // res.json({ success: true });
    res.json({ success: true, message: "Order submitted successfully" });

  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ success: false });
  }
});

//
app.post("/add-to-cart", (req, res) => {
  const { id, name, price, image, quantity } = req.body;
  const existingItem = cart.find(item => item.id === id);
  if (existingItem) {
    existingItem.quantity += parseInt(quantity);
  } else {
    cart.push({ id, name, price, image, quantity: parseInt(quantity) });
  }
  res.redirect("/cart");
});

//
//   const orderId = req.params.id;
//   try {
//     await con.query("DELETE FROM orders WHERE id = $1", [orderId]);
//     res.redirect("/AdminPageOrders");
//   } catch (err) {
//     console.error(err);
//     res.send("Error deleting order");
//   }
// });

// حذف طلب كامل حسب order_id
app.post("/deleteOrder/:id", async (req, res) => {
  const orderId = req.params.id;
  try {
    await con.query("DELETE FROM orders WHERE order_id = $1", [orderId]);
    res.redirect("/AdminPageOrders");
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).send("Server Error");
  }
});
//
app.get('/AdminPageOrders',authenticateToken, async (req, res) => {
  try {
    const result = await con.query('SELECT * FROM orders ORDER BY order_id DESC');
    res.render('AdminPageOrders', { orders: result.rows  });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


app.get("/", (req, res) => {
  res.render("login", { page: "login" });
});

//
app.get("/customer", (req, res) => {
  res.render("project", { page: "store" });
});
//
app.get("/cart", (req, res) => {
  res.render("cart", { page: "cart" });
});


// 
app.get("/chart", authenticateToken, async (req, res) => {
  
  if (req.user.role === 'superadmin') {
    try {
      const result = await con.query(`
        SELECT item_name, SUM(quantity) as total_quantity
        FROM orders
        GROUP BY item_name
        ORDER BY total_quantity DESC
      `);

      const chartData = result.rows;

      res.render("chart", { chartData });
      console.log("Chart data:", chartData); 
    } catch (err) {
      console.error(err);
      res.send("Error loading chart");
    }
  } else {
    res.send("Access Denied"); 
  }
});


// app.get('/logout', (req, res) => {
//   res.clearCookie('token');
//   req.session.destroy();
//   res.redirect('/');
// });



app.get('/weather', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.open-meteo.com/v1/forecast?latitude=31.9552&longitude=35.945&hourly=temperature_2m&current=temperature_2m&forecast_days=1'
    );
    res.render('weather', { weather: response.data });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error fetching weather data');
  }
});

  
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });


  