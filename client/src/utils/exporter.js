import { formatCurrency } from './format';

export const exportToCSV = (transactions, filename = 'transactions.csv') => {
    if (!transactions || transactions.length === 0) {
        alert('No transactions available to export.');
        return;
    }

    const headers = ['Date', 'Type', 'Category', 'Amount (INR)', 'Notes'];
    const rows = transactions.map(t => [
        new Date(t.date).toISOString().split('T')[0],
        t.type.toUpperCase(),
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToExcel = (transactions, filename = 'transactions.xls') => {
    if (!transactions || transactions.length === 0) {
        alert('No transactions available to export.');
        return;
    }

    let tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Transactions</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body>
    <table border="1">
        <thead>
            <tr style="background-color: #6366f1; color: #ffffff; font-weight: bold;">
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Amount (₹)</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
    `;

    transactions.forEach(t => {
        tableHtml += `
            <tr>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.type.toUpperCase()}</td>
                <td>${t.category || ''}</td>
                <td style="text-align: right;">${t.amount}</td>
                <td>${t.notes || ''}</td>
            </tr>
        `;
    });

    tableHtml += `
        </tbody>
    </table>
    </body>
    </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const printPDFStatement = (transactions, user, periodName = 'Financial Statement') => {
    if (!transactions || transactions.length === 0) {
        alert('No transactions available to generate statement.');
        return;
    }

    const income = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const net = income - expense;

    // Category breakdown
    const categoryMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to generate your PDF statement.');
        return;
    }

    const statementHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Financial Statement - ${user?.name || 'Account'}</title>
        <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 26px; font-weight: 700; color: #4338ca; margin: 0; }
            .subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }
            .meta { text-align: right; font-size: 13px; color: #64748b; }
            .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
            .card-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 6px; }
            .card-value { font-size: 22px; font-weight: 700; }
            .green { color: #10b981; }
            .red { color: #ef4444; }
            .purple { color: #6366f1; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            th { background: #f1f5f9; text-align: left; padding: 10px 14px; border-bottom: 2px solid #cbd5e1; color: #475569; }
            td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .text-right { text-align: right; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
            .badge-income { background: #d1fae5; color: #065f46; }
            .badge-expense { background: #fee2e2; color: #991b1b; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
                body { padding: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">
                Save as PDF / Print
            </button>
        </div>

        <div class="header">
            <div>
                <h1 class="title">AI Finance Statement</h1>
                <div class="subtitle">Generated for: <strong>${user?.name || 'Account Holder'}</strong> (${user?.email || ''})</div>
                <div class="subtitle">Report Scope: <strong>${periodName}</strong></div>
            </div>
            <div class="meta">
                <div>Date: <strong>${new Date().toLocaleDateString()}</strong></div>
                <div>Total Transactions: <strong>${transactions.length}</strong></div>
            </div>
        </div>

        <div class="summary-cards">
            <div class="card">
                <div class="card-label">Total Inflow</div>
                <div class="card-value green">${formatCurrency(income)}</div>
            </div>
            <div class="card">
                <div class="card-label">Total Outflow</div>
                <div class="card-value red">${formatCurrency(expense)}</div>
            </div>
            <div class="card">
                <div class="card-label">Net Savings</div>
                <div class="card-value purple">${formatCurrency(net)}</div>
            </div>
        </div>

        <h3 style="margin-bottom: 12px; color: #334155;">Transaction Ledger</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Notes</th>
                    <th class="text-right">Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(t => `
                    <tr>
                        <td>${new Date(t.date).toLocaleDateString()}</td>
                        <td>
                            <span class="badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">
                                ${t.type.toUpperCase()}
                            </span>
                        </td>
                        <td>${t.category}</td>
                        <td>${t.notes || '—'}</td>
                        <td class="text-right" style="font-weight: 600; color: ${t.type === 'income' ? '#10b981' : '#ef4444'};">
                            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            Generated securely by AI Personal Finance Tracker • Confidential Financial Document
        </div>

        <script>
            window.onload = function() {
                setTimeout(function() { window.print(); }, 400);
            };
        </script>
    </body>
    </html>
    `;

    printWindow.document.open();
    printWindow.document.write(statementHtml);
    printWindow.document.close();
};
