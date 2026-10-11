export const formatCurrency = (amount) => {
    const numeric = Number(amount);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(isNaN(numeric) ? 0 : numeric);
};
