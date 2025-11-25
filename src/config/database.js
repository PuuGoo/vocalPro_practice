import sql from "mssql";
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load biến môi trường từ file .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

//Đọc file SQL chứa toàn bộ script tạo bảng
const sqlScript = fs.readFileSync(path.join(__dirname, '../../scripts/database.sql'), 'utf-8');

// Cấu hình kết nối cơ sở dữ liệu
const dbConfig = {
	server: process.env.DB_HOST,    // KHÔNG dùng localhost\\SQLEXPRESS         // THÊM DÒNG NÀY
	database: "master",
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	options: {
		encrypt: false,               // SỬA THÀNH FALSE NẾU KHÔNG DÙNG SSL
		trustServerCertificate: true
	}
};


// Hàm kết nối và khởi tạo cơ sở dữ liệu
export const initDatabase = async () => {
	try {
		// Kết nối đến SQL Server
		console.log('Kết nối đến SQL Server...');
		const pool = await sql.connect(dbConfig);

		// Thực thi script SQL để tạo cơ sở dữ liệu và bảng
		console.log('Khởi tạo cơ sở dữ liệu và bảng...');
		await pool.request().batch(sqlScript);

		console.log('Cơ sở dữ liệu và bảng đã được khởi tạo thành công.');

		return true;
	} catch (error) {
		console.error('Lỗi khi khởi tạo cơ sở dữ liệu:', error);

		return false;
	}
}

// IIFE module để kết nối SQL
(async () => {
	await initDatabase();
})();
