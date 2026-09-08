export function formatCurrency(
  value: number,
  currency: 'INR' | 'USD' = 'INR',
  compact = false
): string {
  if (currency === 'INR') {
    if (compact) {
      if (Math.abs(value) >= 10000000) {
        return `₹${(value / 10000000).toFixed(2)} Cr`;
      }
      if (Math.abs(value) >= 100000) {
        return `₹${(value / 100000).toFixed(2)} L`;
      }
      if (Math.abs(value) >= 1000) {
        return `₹${(value / 1000).toFixed(1)} k`;
      }
    }
    return `₹${Math.round(value).toLocaleString('en-IN')}`;
  } else {
    const usdValue = value * 0.012;
    if (compact) {
      if (Math.abs(usdValue) >= 1000000) {
        return `$${(usdValue / 1000000).toFixed(2)}M`;
      }
      if (Math.abs(usdValue) >= 1000) {
        return `$${(usdValue / 1000).toFixed(1)}k`;
      }
    }
    return `$${Math.round(usdValue).toLocaleString('en-US')}`;
  }
}

export function formatPercent(value: number, includeSign = false): string {
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
