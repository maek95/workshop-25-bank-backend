// "Startkod för server.js i backend": https://github.com/davidshore/chas_banksajt  OCH kollar på 38-todos-express index.js

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { nanoid } from 'nanoid';

// sen när vi ska ladda upp hela projektet på AWS Amazon:
// scp -i <din-nyckel>.pem -r ./ ubuntu@<din-ec2-instans>:/home/ubuntu/bank

// logga in via terminalen (terminalen på datorn, inte vscode kanske lättast)
// shh -i <din-nyckel>.pem -r ./ ubuntu@<din-ec2-instans>

const app = express();
const PORT = 4000;

// FÖR ATT STARTA
// node server.js
// om vi är i aws terminalen:
// sudo node server.js 

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Generera engångslösenord
function generateOTP() { //one time password
    // Generera en sexsiffrig numerisk OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
}

// Din kod här. Skriv dina arrayer

const users = [];
const accounts = [];
const sessions = [];
let accountId = 1; // first bank-account we create for THIS USER so we can set it to 1
let transactionId = 1; // first bank-account we create for THIS USER so we can set it to 1

// Din kod här. Skriv dina routes:

app.get("/", (req, res) => { // "/ är startsidan, t.ex. http://localhost:4000 "
  res.send("Hello World");
})

// Skapa användare (POST): "/users"
// user arrayen: [{id: 101, username: "Joe", password: "hemligt" }, ...]
// account arrayen:
// [{id: 1, userId: 101, amount: 200 }, ...]
app.post("/users", (req, res) => {
  try {
    const data = req.body;

    // Ensure that the request contains necessary data
    //if (!data.username || !data.id) {
      if (!data.username || !data.password ) {
      return res.status(400).json({ error: 'Username and Password are required.' });
    }

    const userId = nanoid();
    const newUser = {...data, "userId": userId};
    users.push(newUser);

    // create an empty bank account:
    
    const amount = 0;
    /* const firstEmptyAccount = {  accountId: 1, userId: userId, amount: amount  };  */
    accounts.push({accountId: accountId++, userId: userId, amount: amount})   
 
    console.log("in users array: ", users);

    res.status(201).json({ message: "User created successfully: ", user: newUser, message2: "All accounts: ", accounts});
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/users", (req, res) => {
  res.json(users);
});


// Logga in (POST): "/sessions"
// kolla så att användarens inmatade lösenord matchar det i users arrayen (med samma id), därefter i sessions arrayen lägger vi då in användarid:t och ett genererat engångslösenord. Skickar tillbaka detta med POST... därefter router.push(/account) för att komma till kontosidan. 
// När man loggar in ska ett engångslösenord (för oss, inte användaren) skapas och skickas tillbaka i response.
// [{userId: 101, token: "nwuefweufh" }, ...]
app.post("/sessions", (req, res) => {
  try {
    const data = req.body;  // type in username & password

    if (!data.username || !data.password ) {
      return res.status(400).json({ error: 'Username and Password are required.' });
    }
    
    
    const loggedInUser = users.find( (user) => {
      return data.username === user.username && data.password === user.password;
    })
  
    

    if (loggedInUser === undefined) {
      return res.json({ error: 'Username or Password is incorrect!' });
    } else {
      console.log(loggedInUser);
      const generatedOTP = generateOTP(); // lösenordet hämtas senare med useRouter (på frontend?)

      const userIdAndToken = {userId: loggedInUser.userId, token: generatedOTP};
      console.log("userIdAndToken", userIdAndToken);

      //sessions.push(data);  
      sessions.push(userIdAndToken); 

      console.log("in sessions array: ", sessions);

      res.status(200).json({message: "Post data for SESSIONS received: ", userIdAndToken:userIdAndToken, message2:". Randomly generated password: ", token: userIdAndToken.token}); 
      //res.json(userIdAndToken); 
    }
   
  } catch (error) {
    console.error("Error finding user:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
  
})

app.get("/sessions", (req, res) => {
  res.json(sessions);
});

// Visa salodo (POST): "/me/accounts"
// i frontend, useEffect hämta saldo och knapp att sätta in pengar (hitta rätt userId med hjälp av engångslösenordet) 
// [{id: 1, userId: 101, amount: 200 }, ...]
// /me eftersom man måste vara inloggad för att få tillgång till detta!
app.post("/me/accounts", (req, res) => {
  const data = req.body; // skriver info i 'body' i thunderclient, ska det vara så på riktigt sen? eller ska det vara ifrån typ ett input field eller något?
  // accounts.push(data); // dont need to copy?
  if (!data.token ) {
    return res.status(400).json({ error: 'Token not found.' });
  }

  const currentSession = sessions.find(session => {
    return data.token === session.token;
  })

  let userAccount; // multiple?
  if (currentSession) { // something has been found, not undefined
    userAccount = accounts.find(account => {
      return account.userId === currentSession.userId;
    })
  } else {
    console.log("user account not found");
  }

  console.log("In accounts array: ", accounts);
 
  res.status(200).json({message: "Post data for ACCOUNTS received: ", amount: userAccount.amount, accountId: userAccount.accountId});

 // res.send("Post data for ACCOUNTS (visa saldo) received: " + JSON.stringify(data)); // show on website?
})

app.get("/me/accounts", (req, res) => {
  res.json(accounts);
});

// Sätt in pengar (POST): "/me/accounts/transactions"
app.post("/me/accounts/transactions", (req, res) => {
  const data = req.body; // pengar som ska sättas in?

  if (!data.transaction || !data.token ) {
    return res.status(400).json({ error: 'Transaction or Token not found.' });
  }
  console.log("Transaction sent:", data.transaction);

  const currentSession = sessions.find(session => { // find the token's session to later find the matching id
    return data.token === session.token;
  })

  let userAccount; // multiple?
  if (currentSession) { // something has been found, not undefined
    userAccount = accounts.find(account => {
      return account.userId === currentSession.userId;
    })
  } else {
    console.log("user account not found");
  }
  console.log("userAccount.amount: ", userAccount.amount);
  const updatedSaldo = userAccount.amount + parseFloat(data.transaction); // parseFloat because transaction is read as a string from JSON
  console.log("updated saldo before submitting: ", updatedSaldo);

  userAccount.amount = updatedSaldo

 /*  accounts.forEach(account => { // mutating data, not the same issue in backend?
    if (account.accountId === userAccount.accountId) { // onödigt när vi redan hittat userAccount ovanför eller?
      account.amount = updatedSaldo; // Update the amount directly in the existing account object
      account.transactionList.push({transactionId: transactionId++, transaction: parseFloat(data.transaction)}); // maybe make an empty transactionList array first? 
    }
  });
 */
  console.log("in accounts array AFTER transaction: ", accounts);

  //res.send("Post data for TRANSACTIONS (sätt in pengar) received: " + JSON.stringify(data) + ". New saldo is now " + sumSaldo); 
  res.status(200).json({message: "Post data for TRANSACTIONS received: ", data, message2: "Deposit completed"});
})

app.get("/me/accounts/transactions", (req, res) => {
  res.json(accounts);
});

// ska jag använda PUT något?
// PUT: This method is used to update an existing resource 
// e.g. users/1  ?
//app.put("/users/:id", (req, res) => { })

// Starta servern
app.listen(PORT, () => {
    console.log(`Bankens backend körs på http://localhost:${PORT}`);
});

/* module.exports = app; */

export default app;