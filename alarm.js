const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');

// Ganti dengan API Token yang Anda dapatkan dari BotFather
const bot = new Telegraf('7312548439:AAEcqriwL6Ihi91mx26KuFXV0Cmqm8PzZU4');

// Tempat penyimpanan catatan, gambar, dan pengingat
let notes = {};
let images = {};
let reminders = {};

// Fungsi untuk menyimpan data ke file
function saveData() {
    fs.writeFileSync('notes.json', JSON.stringify(notes));
    fs.writeFileSync('images.json', JSON.stringify(images));
    fs.writeFileSync('reminders.json', JSON.stringify(reminders));
}

// Fungsi untuk memuat data dari file
function loadData() {
    if (fs.existsSync('notes.json')) {
        notes = JSON.parse(fs.readFileSync('notes.json'));
    }
    if (fs.existsSync('images.json')) {
        images = JSON.parse(fs.readFileSync('images.json'));
    }
    if (fs.existsSync('reminders.json')) {
        reminders = JSON.parse(fs.readFileSync('reminders.json'));
    }
}

// Memuat data yang tersimpan saat bot dimulai
loadData();

// Fungsi untuk mengatur pengingat
function setReminder(ctx, title, date) {
    const now = new Date();
    const reminderDate = new Date(date);

    if (reminderDate > now) {
        const timeout = reminderDate - now;

        setTimeout(() => {
            ctx.reply(`Pengingat: ${title}`);
            delete reminders[title];
            saveData();
        }, timeout);

        ctx.reply(`Pengingat untuk "${title}" telah diatur pada ${reminderDate}.`);
    } else {
        ctx.reply('Tanggal dan waktu yang diberikan sudah lewat. Pengingat tidak bisa diatur.');
    }
}

// Command untuk menambahkan pengingat
bot.command('tambahpengingat', (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const dateStr = args.slice(-1)[0]; // Ambil tanggal dan waktu dari argumen terakhir
    const title = args.slice(0, -1).join(' '); // Ambil judul dari sisa argumen

    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
        ctx.reply('Format tanggal dan waktu tidak valid. Gunakan format YYYY-MM-DDTHH:mm:ss (contoh: 2024-08-20T15:30:00).');
        return;
    }

    reminders[title] = dateStr;
    saveData();

    setReminder(ctx, title, dateStr);
});

// Command untuk melihat pengingat yang diatur
bot.command('lihatpengingat', (ctx) => {
    if (Object.keys(reminders).length === 0) {
        ctx.reply('Tidak ada pengingat yang diatur.');
        return;
    }

    let reminderText = 'Pengingat yang diatur:\n';
    for (const [title, dateStr] of Object.entries(reminders)) {
        reminderText += `${title}: ${dateStr}\n`;
    }

    ctx.reply(reminderText);
});

// Command untuk menghapus pengingat
bot.command('hapuspengingat', (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const title = args.join(' ');

    if (reminders[title]) {
        delete reminders[title];
        saveData();
        ctx.reply(`Pengingat "${title}" telah dihapus.`);
    } else {
        ctx.reply(`Pengingat dengan judul "${title}" tidak ditemukan.`);
    }
});

bot.launch();

console.log('Bot berjalan...');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
