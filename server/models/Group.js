const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
    memberName: { type: String, required: true },
    amountOwed: { type: Number, required: true },
    settled: { type: Boolean, default: false }
}, { _id: false });

const expenseSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    paidBy: { type: String, required: true }, // member name
    category: { type: String, default: 'General' },
    splitType: { type: String, enum: ['equal', 'exact', 'percentage'], default: 'equal' },
    splits: [splitSchema],
    date: { type: Date, default: Date.now },
    notes: { type: String },
    syncedToPersonal: { type: Boolean, default: false }
}, { timestamps: true });

const settlementSchema = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String }
}, { timestamps: true });

const memberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    upiId: { type: String }, // e.g. user@oksbi or 9876543210@paytm
    isCurrentUser: { type: Boolean, default: false }
}, { _id: false });

const groupSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['Trip', 'Flat/Home', 'Dining', 'Event', 'Project', 'Other'],
        default: 'Trip'
    },
    description: {
        type: String,
        trim: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    members: [memberSchema],
    expenses: [expenseSchema],
    settlements: [settlementSchema]
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
