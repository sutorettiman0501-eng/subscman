/**
 * SubscMan - Firebase Firestore データ管理モジュール
 * Firestore を使ったデータ永続化（クラウド同期対応）
 * ログインしていない場合はLocalStorageにフォールバック
 */

class SubscManStorage {
    constructor() {
        this.SUBSCRIPTIONS_KEY = 'subscman_subscriptions';
        this.SETTINGS_KEY = 'subscman_settings';
        this.API_KEY_KEY = 'subscman_api_key';

        // LocalStorage初期化
        this.initializeIfEmpty();
    }

    // ===================================
    // ユーザー関連
    // ===================================

    /**
     * 現在のユーザーIDを取得
     * @returns {string|null} ユーザーID
     */
    getUserId() {
        if (typeof firebaseAuth !== 'undefined' && firebaseAuth.isLoggedIn()) {
            return firebaseAuth.getCurrentUser().uid;
        }
        return null;
    }

    /**
     * Firestoreを使用するかどうか
     * @returns {boolean}
     */
    useFirestore() {
        return this.getUserId() !== null;
    }

    /**
     * ユーザーのFirestoreコレクション参照を取得
     * @param {string} collection - コレクション名
     * @returns {Object} Firestore コレクション参照
     */
    getUserCollection(collection) {
        const userId = this.getUserId();
        if (!userId) return null;
        return db.collection('users').doc(userId).collection(collection);
    }

    // ===================================
    // Subscriptions コレクション
    // ===================================

    /**
     * 全サブスクリプションを取得
     * @param {boolean} activeOnly - true の場合、is_active = true のみ取得
     * @returns {Promise<Array>} サブスクリプション配列
     */
    async getSubscriptions(activeOnly = true) {
        if (this.useFirestore()) {
            try {
                const collection = this.getUserCollection('subscriptions');
                let query = collection;

                if (activeOnly) {
                    query = collection.where('is_active', '==', true);
                }

                const snapshot = await query.get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error('Firestore getSubscriptions error:', error);
                return this.getSubscriptionsLocal(activeOnly);
            }
        }
        return this.getSubscriptionsLocal(activeOnly);
    }

    /**
     * LocalStorageから全サブスクリプションを取得
     */
    getSubscriptionsLocal(activeOnly = true) {
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
     * @returns {Promise<Object|null>} サブスクリプションオブジェクト
     */
    async getSubscriptionById(id) {
        if (this.useFirestore()) {
            try {
                const doc = await this.getUserCollection('subscriptions').doc(id).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
                return null;
            } catch (error) {
                console.error('Firestore getSubscriptionById error:', error);
                return this.getSubscriptionByIdLocal(id);
            }
        }
        return this.getSubscriptionByIdLocal(id);
    }

    /**
     * LocalStorageからIDでサブスクリプションを取得
     */
    getSubscriptionByIdLocal(id) {
        const subscriptions = this.getSubscriptionsLocal(false);
        return subscriptions.find(sub => sub.id === id) || null;
    }

    /**
     * サブスクリプションを追加
     * @param {Object} data - サブスクリプションデータ
     * @returns {Promise<Object>} 追加されたサブスクリプション
     */
    async addSubscription(data) {
        const newSubscription = {
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

        if (this.useFirestore()) {
            try {
                const docRef = await this.getUserCollection('subscriptions').add(newSubscription);
                return { id: docRef.id, ...newSubscription };
            } catch (error) {
                console.error('Firestore addSubscription error:', error);
                return this.addSubscriptionLocal(newSubscription);
            }
        }
        return this.addSubscriptionLocal(newSubscription);
    }

    /**
     * LocalStorageにサブスクリプションを追加
     */
    addSubscriptionLocal(data) {
        const subscriptions = this.getSubscriptionsLocal(false);
        const newSubscription = {
            id: this.generateId(),
            ...data
        };
        subscriptions.push(newSubscription);
        localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
        return newSubscription;
    }

    /**
     * サブスクリプションを更新
     * @param {string} id - サブスクリプションID
     * @param {Object} data - 更新データ
     * @returns {Promise<Object|null>} 更新されたサブスクリプション
     */
    async updateSubscription(id, data) {
        const updateData = {
            ...data,
            updated_at: new Date().toISOString()
        };

        if (this.useFirestore()) {
            try {
                await this.getUserCollection('subscriptions').doc(id).update(updateData);
                return { id, ...updateData };
            } catch (error) {
                console.error('Firestore updateSubscription error:', error);
                return this.updateSubscriptionLocal(id, updateData);
            }
        }
        return this.updateSubscriptionLocal(id, updateData);
    }

    /**
     * LocalStorageでサブスクリプションを更新
     */
    updateSubscriptionLocal(id, data) {
        const subscriptions = this.getSubscriptionsLocal(false);
        const index = subscriptions.findIndex(sub => sub.id === id);

        if (index === -1) {
            return null;
        }

        subscriptions[index] = {
            ...subscriptions[index],
            ...data
        };

        localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
        return subscriptions[index];
    }

    /**
     * サブスクリプションを削除（物理削除）
     * @param {string} id - サブスクリプションID
     * @returns {Promise<boolean>} 削除成功/失敗
     */
    async deleteSubscription(id) {
        if (this.useFirestore()) {
            try {
                await this.getUserCollection('subscriptions').doc(id).delete();
                return true;
            } catch (error) {
                console.error('Firestore deleteSubscription error:', error);
                return this.deleteSubscriptionLocal(id);
            }
        }
        return this.deleteSubscriptionLocal(id);
    }

    /**
     * LocalStorageでサブスクリプションを削除
     */
    deleteSubscriptionLocal(id) {
        const subscriptions = this.getSubscriptionsLocal(false);
        const filtered = subscriptions.filter(sub => sub.id !== id);

        if (filtered.length === subscriptions.length) {
            return false;
        }

        localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify(filtered));
        return true;
    }

    // ===================================
    // Settings コレクション
    // ===================================

    /**
     * 設定を取得
     * @returns {Promise<Object>} 設定オブジェクト
     */
    async getSettings() {
        if (this.useFirestore()) {
            try {
                const doc = await db.collection('users').doc(this.getUserId()).get();
                if (doc.exists && doc.data().settings) {
                    return doc.data().settings;
                }
            } catch (error) {
                console.error('Firestore getSettings error:', error);
            }
        }
        return this.getSettingsLocal();
    }

    /**
     * LocalStorageから設定を取得
     */
    getSettingsLocal() {
        const data = localStorage.getItem(this.SETTINGS_KEY);
        return data ? JSON.parse(data) : this.getDefaultSettings();
    }

    /**
     * 為替レートを更新
     * @param {number} rate - USD/JPY レート
     * @returns {Promise<Object>} 更新された設定
     */
    async updateExchangeRate(rate) {
        const settings = await this.getSettings();
        settings.usd_to_jpy_rate = parseFloat(rate);
        settings.last_updated = new Date().toISOString();

        if (this.useFirestore()) {
            try {
                await db.collection('users').doc(this.getUserId()).set(
                    { settings },
                    { merge: true }
                );
            } catch (error) {
                console.error('Firestore updateExchangeRate error:', error);
            }
        }

        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        return settings;
    }

    // ===================================
    // API キー管理
    // ===================================

    getApiKey() {
        return localStorage.getItem(this.API_KEY_KEY);
    }

    setApiKey(key) {
        localStorage.setItem(this.API_KEY_KEY, key);
    }

    removeApiKey() {
        localStorage.removeItem(this.API_KEY_KEY);
    }

    // ===================================
    // データ同期
    // ===================================

    /**
     * LocalStorageのデータをFirestoreにアップロード
     */
    async uploadLocalDataToFirestore() {
        if (!this.useFirestore()) return;

        const localSubs = this.getSubscriptionsLocal(false);
        const batch = db.batch();
        const collection = this.getUserCollection('subscriptions');

        for (const sub of localSubs) {
            const docRef = collection.doc();
            const { id, ...data } = sub;
            batch.set(docRef, data);
        }

        try {
            await batch.commit();
            // アップロード成功後、ローカルデータをクリア
            localStorage.removeItem(this.SUBSCRIPTIONS_KEY);
            return true;
        } catch (error) {
            console.error('Upload to Firestore error:', error);
            return false;
        }
    }

    // ===================================
    // ユーティリティ
    // ===================================

    generateId() {
        return 'sub_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    getDefaultSettings() {
        return {
            id: 'settings_1',
            usd_to_jpy_rate: 150.00,
            last_updated: new Date().toISOString()
        };
    }

    initializeIfEmpty() {
        if (!localStorage.getItem(this.SETTINGS_KEY)) {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.getDefaultSettings()));
        }
        if (!localStorage.getItem(this.SUBSCRIPTIONS_KEY)) {
            localStorage.setItem(this.SUBSCRIPTIONS_KEY, JSON.stringify([]));
        }
    }

    /**
     * サンプルデータを投入（デモ用）
     */
    async loadSampleData() {
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
            }
        ];

        const settings = await this.getSettings();

        for (const sub of sampleSubscriptions) {
            const amounts = calculator.calculateAmounts(sub, settings.usd_to_jpy_rate);
            await this.addSubscription({
                ...sub,
                ...amounts
            });
        }
    }
}

// グローバルインスタンスを作成
const storage = new SubscManStorage();
