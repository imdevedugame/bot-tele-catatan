require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const { db, collection, addDoc, getDocs, doc, setDoc, deleteDoc, Timestamp } = require('./firebase');

const bot = new Telegraf('7312548439:AAEcqriwL6Ihi91mx26KuFXV0Cmqm8PzZU4');

const openaiApiKey = process.env.OPENAI_API_KEY; // Pindahkan API key ke .env

let userState = {};

// Fungsi untuk mengatur pengingat
async function setReminder(ctx, title, date) {
    const now = new Date();
    const reminderDate = new Date(date);

    if (reminderDate > now) {
        const timeout = reminderDate - now;

        setTimeout(async () => {
            ctx.reply(`Pengingat: ${title}`);
            const querySnapshot = await getDocs(collection(db, 'reminders'));
            let reminderId = null;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.title === title && data.userId === ctx.from.id) {
                    reminderId = doc.id;
                }
            });

            if (reminderId) {
                await deleteDoc(doc(db, 'reminders', reminderId));
            }
        }, timeout);

        ctx.reply(`Pengingat untuk "${title}" telah diatur pada ${reminderDate}.`);
    } else {
        ctx.reply('Tanggal dan waktu yang diberikan sudah lewat. Pengingat tidak bisa diatur.');
    }
}

// Command untuk membuat catatan baru
bot.command('newcatatan', (ctx) => {
    ctx.reply('Masukkan judul catatan:');
    userState[ctx.from.id] = { state: 'AWAITING_TITLE' };

    const textHandler = async (ctx) => {
        const userId = ctx.from.id;
        if (!userState[userId]) return;

        if (userState[userId].state === 'AWAITING_TITLE') {
            userState[userId].title = ctx.message.text;
            userState[userId].state = 'AWAITING_CONTENT';
            ctx.reply(`Catatan berjudul "${userState[userId].title}" telah dibuat. Silahkan masukkan isi catatan, dan ketik "selesai" jika sudah selesai:`);
        } else if (userState[userId].state === 'AWAITING_CONTENT') {
            const input = ctx.message.text;

            if (input.toLowerCase() === 'selesai') {
                const note = {
                    title: userState[userId].title,
                    content: userState[userId].content ? userState[userId].content.trim() : '',
                    userId: userId
                };
                await addDoc(collection(db, 'notes'), note);
                ctx.reply(`Catatan "${userState[userId].title}" telah disimpan di Firebase.`);
                delete userState[userId];
                bot.off('text', textHandler); // Nonaktifkan handler setelah selesai
            } else {
                if (!userState[userId].content) userState[userId].content = '';
                userState[userId].content += input + '\n';
            }
        }
    };

    bot.on('text', textHandler);
});

// Command untuk menambah pengingat
bot.command('tambahpengingat', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const dateStr = args.slice(-1)[0];
    const title = args.slice(0, -1).join(' ');

    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
        ctx.reply('Format tanggal dan waktu tidak valid. Gunakan format YYYY-MM-DDTHH:mm:ss (contoh: 2024-08-20T15:30:00).');
        return;
    }

    const reminder = {
        title: title,
        date: Timestamp.fromDate(date),
        userId: ctx.from.id,
        status: 'pending'
    };

    await addDoc(collection(db, 'reminders'), reminder);
    ctx.reply(`Pengingat "${title}" telah ditambahkan untuk tanggal ${date.toLocaleString()}.`);

    setReminder(ctx, title, dateStr);
});

// Command untuk melihat pengingat
bot.command('lihatpengingat', async (ctx) => {
    const querySnapshot = await getDocs(collection(db, 'reminders'));
    let reminders = [];

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId === ctx.from.id) {
            reminders.push({ ...data, id: doc.id });
        }
    });

    if (reminders.length === 0) {
        ctx.reply('Tidak ada pengingat yang ditemukan.');
    } else {
        let reminderText = 'Pengingat Anda:\n';
        reminders.forEach((reminder) => {
            reminderText += `- ${reminder.title}: ${reminder.date.toDate().toLocaleString()} (Status: ${reminder.status})\n`;
        });
        ctx.reply(reminderText);
    }
});

// Command untuk menghapus pengingat
bot.command('hapuspengingat', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const title = args.join(' ');

    const querySnapshot = await getDocs(collection(db, 'reminders'));
    let reminderId = null;

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.title === title && data.userId === ctx.from.id) {
            reminderId = doc.id;
        }
    });

    if (reminderId) {
        await deleteDoc(doc(db, 'reminders', reminderId));
        ctx.reply(`Pengingat "${title}" telah dihapus dari Firebase.`);
    } else {
        ctx.reply(`Pengingat dengan judul "${title}" tidak ditemukan.`);
    }
});

// Command untuk melihat catatan
bot.command('lihatcatatan', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const title = args.join(' ');
    console.log(`Mencari catatan dengan judul: ${title}`);

    const querySnapshot = await getDocs(collection(db, 'notes'));
    let foundNote = null;

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Memeriksa catatan: ${data.title}`);
        if (data.title.toLowerCase() === title.toLowerCase() && data.userId === ctx.from.id) {
            foundNote = data;
            console.log(`Catatan ditemukan: ${JSON.stringify(foundNote)}`);
        }
    });

    if (!foundNote) {
        console.log(`Catatan dengan judul "${title}" tidak ditemukan.`);
        ctx.reply(`Catatan dengan judul "${title}" tidak ditemukan.`);
        return;
    }

    ctx.reply(`Catatan "${title}":\n\n${foundNote.content}`);
});

// Command untuk menghapus catatan
bot.command('hapuscatatan', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const title = args.join(' ');

    const querySnapshot = await getDocs(collection(db, 'notes'));
    let noteId = null;
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.title.toLowerCase() === title.toLowerCase() && data.userId === ctx.from.id) {
            noteId = doc.id;
        }
    });

    if (noteId) {
        await deleteDoc(doc(db, 'notes', noteId));
        ctx.reply(`Catatan "${title}" telah dihapus dari Firebase.`);
    } else {
        ctx.reply(`Catatan dengan judul "${title}" tidak ditemukan.`);
    }
});

// Command untuk mengupload gambar
bot.command('uploadgambar', (ctx) => {
    ctx.reply('Silahkan upload gambar catatan:');

    bot.on('photo', async (msg) => {
        const fileId = msg.message.photo[msg.message.photo.length - 1].file_id;
        const fileUrl = await bot.telegram.getFileLink(fileId);
        ctx.reply(`Gambar telah diterima dan disimpan. Link gambar: ${fileUrl}`);
    });
});

bot.launch();

console.log('Bot berjalan...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
