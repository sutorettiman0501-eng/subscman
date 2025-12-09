/**
 * SubscMan - 金額計算モジュール
 * 為替変換と月額/年額計算を担当
 */

class SubscriptionCalculator {
    /**
     * 通貨を日本円に変換
     * @param {number} amount - 元の金額
     * @param {string} currency - 通貨コード（'JPY' または 'USD'）
     * @param {number} exchangeRate - USD/JPY レート
     * @returns {number} 日本円での金額
     */
    convertToJPY(amount, currency, exchangeRate) {
        if (currency === 'JPY') {
            return amount;
        } else if (currency === 'USD') {
            return amount * exchangeRate;
        }
        // その他の通貨は未対応
        return amount;
    }

    /**
     * 月額と年額を計算
     * @param {number} originalJPY - 円換算後の元金額
     * @param {string} billingCycle - 支払いサイクル（'月払い', '年払い', 'その他'）
     * @returns {Object} { monthly, yearly }
     */
    calculateMonthlyYearly(originalJPY, billingCycle) {
        let monthly, yearly;

        switch (billingCycle) {
            case '月払い':
                monthly = originalJPY;
                yearly = originalJPY * 12;
                break;
            case '年払い':
                monthly = originalJPY / 12;
                yearly = originalJPY;
                break;
            case 'その他':
            default:
                // その他の場合は月額として扱う
                monthly = originalJPY;
                yearly = originalJPY * 12;
                break;
        }

        return {
            monthly: Math.round(monthly),
            yearly: Math.round(yearly)
        };
    }

    /**
     * サブスクリプション保存時の金額計算
     * @param {Object} data - サブスクリプションデータ
     * @param {number} exchangeRate - USD/JPY レート
     * @returns {Object} { amount_jpy_monthly, amount_jpy_yearly }
     */
    calculateAmounts(data, exchangeRate) {
        // 1. 元の金額を円に変換
        const originalJPY = this.convertToJPY(
            parseFloat(data.amount_original),
            data.currency,
            exchangeRate
        );

        // 2. 月額/年額を計算
        const { monthly, yearly } = this.calculateMonthlyYearly(
            originalJPY,
            data.billing_cycle
        );

        return {
            amount_jpy_monthly: monthly,
            amount_jpy_yearly: yearly
        };
    }

    /**
     * アクティブなサブスクの月額合計を計算
     * @param {Array} subscriptions - サブスクリプション配列
     * @returns {number} 月額合計
     */
    getTotalMonthly(subscriptions) {
        return subscriptions.reduce((sum, sub) => {
            return sum + (sub.amount_jpy_monthly || 0);
        }, 0);
    }

    /**
     * アクティブなサブスクの年額合計を計算
     * @param {Array} subscriptions - サブスクリプション配列
     * @returns {number} 年額合計
     */
    getTotalYearly(subscriptions) {
        return subscriptions.reduce((sum, sub) => {
            return sum + (sub.amount_jpy_yearly || 0);
        }, 0);
    }

    /**
     * カテゴリ別の月額内訳を計算
     * @param {Array} subscriptions - サブスクリプション配列
     * @returns {Object} カテゴリ別金額 { 'エンタメ': 1000, ... }
     */
    getCategoryBreakdown(subscriptions) {
        const breakdown = {};

        subscriptions.forEach(sub => {
            const category = sub.category || 'その他';
            if (!breakdown[category]) {
                breakdown[category] = 0;
            }
            breakdown[category] += sub.amount_jpy_monthly || 0;
        });

        return breakdown;
    }

    /**
     * 金額を円表示用にフォーマット
     * @param {number} amount - 金額
     * @returns {string} フォーマット済み文字列（例：¥1,234）
     */
    formatJPY(amount) {
        return '¥' + Math.round(amount).toLocaleString('ja-JP');
    }

    /**
     * 元の金額を表示用にフォーマット
     * @param {number} amount - 金額
     * @param {string} currency - 通貨コード
     * @returns {string} フォーマット済み文字列（例：$20 / ¥1,000）
     */
    formatOriginalAmount(amount, currency) {
        if (currency === 'USD') {
            return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        }
        return '¥' + Math.round(amount).toLocaleString('ja-JP');
    }
}

// グローバルインスタンスを作成
const calculator = new SubscriptionCalculator();
