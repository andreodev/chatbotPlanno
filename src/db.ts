import mysql from 'mysql2/promise';

// Criação de conexão com o banco
let connection: mysql.Connection;

// Função para criar a conexão com o banco
export async function connectDb() {
  if (!connection) {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '30112004as',
      database: 'plano',
    });
  }
  return connection;
}

// Função para verificar se o número existe no banco de dados e pegar o nome
export async function checkIfPhoneExists(phone: string) {
  const conn = await connectDb();
  const [rows]: [any[], any] = await conn.execute(
    'SELECT * FROM user WHERE phone = ?',
    [phone]
  );

  if (rows.length > 0) {
    console.log('Número encontrado no banco!');
    return rows[0]; // Retorna os dados do usuário (incluindo o nome)
  } else {
    console.log('Número não encontrado no banco.');
    return null;
  }
}
