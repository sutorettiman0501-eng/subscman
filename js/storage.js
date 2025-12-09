/**
 * SubscMan - LocalStorage データ管理モジュール
 * サブスクリプションと設定データの永続化を担当
 */

class SubscManStorage {
    constructor() {
        this.SUBSCRIPTIONS_KEY = 'subscman_subscriptions';
        this.SETTINGS_KEY = 'subscman_settings';
        this.API_KEY_KEY = 'subscman_api_key';
        
        // 初回起動時はデフォルトデータを投入
        this.initializeIfEmpty();
    }
    
    // ===================================
    // Subscriptions コレクション
    // ===================================
    
    /**
     * 全サブスクリプションを取得
     * @param {boolean} activeOnly - true の場合、is_active = true のみ取得
     * @returns {Array} サブスクリプション配列
     */
    getSubscriptions(activeOnly = true) {
        const data = localStorage.getItem(this.SUBSCRIPTIONS_KEY);
        const subscriptions = data ? JSON.parse(data) : [];
        
        if (activeOnly) {
            return subscriptions.filter(sub => sub.is_active);
        }
        return subscriptions;
    }
    
    /**
     * IDでサブスクリプションを取得
     * @param {string} id - サブスクリプションID
     * @returns {Object|null} サブスクリプションオブジェクト
     */
    getSubscriptionById(id) {
        const subscriptions = this.getSubscriptions(false);
        return subscriptions.find(sub => sub.id === id) || null;
    }
    
    /**
     * サブスクリプションを追加
     * @param {Object} data - サブスクリプションデータ
     * @returns {Object} 追加されたサブスクリプション
     */
    addSubscription(data) {
        const subscriptions = this.getSubscriptions(false);
        
        const newSubscription = {
            id: this.generateId(),
            service_name: data.service_name,
            amount_original: parseFloat(data.amount_original),
            currency: data.currency,
            amount_jpy_monthly: data.amount_jpy_monthly,
            amount_jpy_yearly: data.amount_jpy_yearly,
            billing_cycle: data.billing_cycle || '月払い',
            category: data.category || 'その他',
            start_date: data.start_date || null,
            next_billing_date: data.next_billing_date || null,
            memo: data.memo || '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        subscriptions.push(newSubscription);
        localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
        
        return newSubscription;
    }
    
    /**
     * サブスクリプションを更新
     * @param {string} id - サブスクリプションID
     * @param {Object} data - 更新データ
     * @returns {Object|null} 更新されたサブスクリプション
     */
    updateSubscription(id, data) {
        const subscriptions = this.getSubscriptions(false);
        const index = subscriptions.findIndex(sub => sub.id === id);
        
        if (index === -1) {
            return null;
        }
        
        subscriptions[index] = {
            ...subscriptions[index],
            ...data,
            updated_at: new Date().toISOString()
        };
        
        localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
        
        return subscriptions[index];
    }
    
    /**
     * サブスクリプションを削除（物理削除）
     * @param {string} id - サブスクリプションID
     * @returns {boolean} 削除成功/失敗
     */
    deleteSubscription(id) {
        const subscriptions = this.getSubscriptions(false);
        const filtered = subscriptions.filter(sub => sub.id !== id);
        
        if (filtered.length === subscriptions.length) {
            return false;
        }
        
        localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify(filtered));
        return true;
    }
    
    /**
     * サブスクリプションを非アクティブ化（論理削除）
     * @param {string} id - サブスクリプションID
     * @returns {Object|null} 更新されたサブスクリプション
     */
    deactivateSubscription(id) {
        return this.updateSubscription(id, { is_active: false });
    }
    
    // ===================================
    // Settings コレクション
    // ===================================
    
    /**
     * 設定を取得
     * @returns {Object} 設定オブジェクト
     */
    getSettings() {
        const data = localStorage.getItem(this.SETTINGS_KEY);
        return data ? JSON.parse(data) : this.getDefaultSettings();
    }
    
    /**
     * 為替レートを更新
     * @param {number} rate - USD/JPY レート
     * @returns {Object} 更新された設定
     */
    updateExchangeRate(rate) {
        const settings = this.getSettings();
        settings.usd_to_jpy_rate = parseFloat(rate);
        settings.last_updated = new Date().toISOString();
        
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        
        return settings;
    }
    
    /**
     * 設定を更新
     * @param {Object} data - 更新データ
     * @returns {Object} 更新された設定
     */
    updateSettings(data) {
        const settings = this.getSettings();
        const updated = { ...settings, ...data };
        
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
        
        return updated;
    }
    
    // ===================================
    // API キー管理
    // ===================================
    
    /**
     * OpenAI API キーを取得
     * @returns {string|null} APIキー
     */
    getApiKey() {
        return localStorage.getItem(this.API_KEY_KEY);
    }
    
    /**
     * OpenAI API キーを保存
     * @param {string} key - APIキー
     */
    setApiKey(key) {
        localStorage.setItem(this.API_KEY_KEY, key);
    }
    
    /**
     * OpenAI API キーを削除
     */
    removeApiKey() {
        localStorage.removeItem(this.API_KEY_KEY);
    }
    
    // ===================================
    // ユーティリティ
    // ===================================
    
    /**
     * ユニークIDを生成
     * @returns {string} ユニークID
     */
    generateId() {
        return 'sub_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * デフォルト設定を取得
     * @returns {Object} デフォルト設定
     */
    getDefaultSettings() {
        return {
            id: 'settings_1',
            usd_to_jpy_rate: 150.00,
            last_updated: new Date().toISOString()
        };
    }
    
    /**
     * 初回起動時のデータ初期化
     */
    initializeIfEmpty() {
        // 設定が存在しない場合はデフォルト設定を保存
        if (!localStorage.getItem(this.SETTINGS_KEY)) {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.getDefaultSettings()));
        }
        
        // サブスクリプションが存在しない場合は空配列を保存
        if (!localStorage.getItem(this.SUBSCRIPTIONS_KEY)) {
            localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify([]));
        }
    }
    
    /**
     * サンプルデータを投入（デモ用）
     */
    loadSampleData() {
        const sampleSubscriptions = [
            {
                service_name: 'Netflix',
                amount_original: 1490,
                currency: 'JPY',
                billing_cycle: '月払い',
                category: 'エンタメ',
                start_date: '2023-01-15',
                next_billing_date: '2024-12-15',
                memo: 'スタンダードプラン'
            },
            {
                service_name: 'Spotify',
                amount_original: 980,
                currency: 'JPY',
                billing_cycle: '月払い',
                category: 'エンタメ',
                start_date: '2022-06-01',
                next_billing_date: '2024-12-01',
                memo: ''
            },
            {
                service_name: 'ChatGPT Plus',
                amount_original: 20,
                currency: 'USD',
                billing_cycle: '月払い',
                category: 'AI',
                start_date: '2023-03-01',
                next_billing_date: '2024-12-01',
                memo: 'GPT-4使用可能'
            },
            {
                service_name: 'Claude Pro',
                amount_original: 20,
                currency: 'USD',
                billing_cycle: '月払い',
                category: 'AI',
                start_date: '2024-01-15',
                next_billing_date: '2024-12-15',
                memo: ''
            },
            {
                service_name: 'Microsoft 365',
                amount_original: 12984,
                currency: 'JPY',
                billing_cycle: '年払い',
                category: '仕事',
                start_date: '2023-04-01',
                next_billing_date: '2025-04-01',
                memo: 'Family プラン'
            },
            {
                service_name: 'Adobe Creative Cloud',
                amount_original: 6480,
                currency: 'JPY',
                billing_cycle: '月払い',
                category: '仕事',
                start_date: '2022-09-01',
                next_billing_date: '2024-12-01',
                memo: 'フォトプラン'
            },
            {
                service_name: 'Duolingo Plus',
                amount_original: 8800,
                currency: 'JPY',
                billing_cycle: '年払い',
                category: '教育',
                start_date: '2024-02-01',
                next_billing_date: '2025-02-01',
                memo: '英語学習'
            },
            {
                service_name: 'Amazon Prime',
                amount_original: 4900,
                currency: 'JPY',
                billing_cycle: '年払い',
                category: '生活',
                start_date: '2021-11-01',
                next_billing_date: '2024-11-01',
                memo: ''
            }
        ];
        
        // 為替レートを取得して金額を計算
        const settings = this.getSettings();
        const calculator = new SubscriptionCalculator();
        
        sampleSubscriptions.forEach(sub => {
            const amounts = calculator.calculateAmounts(sub, settings.usd_to_jpy_rate);
            this.addSubscription({
                ...sub,
                ...amounts
            });
        });
    }
    
    /**
     * 全データをクリア
     */
    clearAllData() {
        localStorage.removeItem(this.SUBSCRIPTIONS_KEY);
        localStorage.removeItem(this.SETTINGS_KEY);
        localStorage.removeItem(this.API_KEY_KEY);
        this.initializeIfEmpty();
    }
}

// グローバルインスタンスを作成
const storage = new SubscManStorage();
