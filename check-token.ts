import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjUsImVtYWlsIjoic2FtaXRlbG8xMEBnbWFpbC5jb20iLCJyb2xlIjoiU1VQRVJBRE1JTiIsImlhdCI6MTc2OTE0NDU5MywiZXhwIjoxNzY5MTQ4MTkzfQ.ZQTT6MJyMtdla_OisU4l32w5OnQA__IIMOYwuwIgkJw'; // sans "Bearer "

const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error(' JWT_SECRET non défini');
  process.exit(1);
}

try {
  const decoded = jwt.verify(token, secret);
  console.log(' TOKEN VALIDE');
  console.log(decoded);
} catch (err) {
  if (err instanceof Error) {
    console.error('TOKEN INVALIDE :', err.message);
  } else {
    console.error(' ERREUR INCONNUE');
  }
}
