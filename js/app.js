/**
 * SubscMan - メインアプリケーションモジュール
 * アプリ全体の初期化とイベントリスナーの設定
 * Firebase認証との連携
 */

class SubscManApp {
    constructor() {
        this.bindEvents();
        this.initializeAuth();
    }

    /**
     * Firebase認証の初期化と状態監視
     */
    initializeAuth() {
        // 認証状態の変化を監視
        firebaseAuth.onAuthStateChanged(async (user) => {
            this.updateAuthUI(user);
            await this.refreshData();
        });
    }

    /**
     * 認証UIを更新
     * @param {Object|null} user - ユーザー情報
     */
    updateAuthUI(user) {
        const authStatus = document.getElementById('auth-status');

        if (user) {
            // ログイン済み
            authStatus.innerHTML = `
                <div class="user-info">
                    <img src="${user.photoURL || ''}" alt="" class="user-avatar" onerror="this.style.display='none'">
                    <span class="user-name">${user.displayName || 'ユーザー'}</span>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-logout">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    ログアウト
                </button>
            `;

            // ログアウトボタンにイベント追加
            document.getElementById('btn-logout').addEventListener('click', () => this.handleLogout());

            // 同期ボタンを表示（初回ログイン時にローカルデータをアップロード）
            this.checkAndOfferSync();
        } else {
            // 未ログイン
            authStatus.innerHTML = `
                <button class="btn btn-secondary btn-sm" id="btn-login">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    ログイン
                </button>
            `;

            // ログインボタンにイベント追加
            document.getElementById('btn-login').addEventListener('click', () => this.handleLogin());
        }
    }

    /**
     * ローカルデータがあれば同期を提案
     */
    async checkAndOfferSync() {
        const localSubs = storage.getSubscriptionsLocal(false);
        if (localSubs.length > 0) {
            const shouldSync = confirm(
                `ローカルに${localSubs.length}件のサブスクデータがあります。\nクラウドにアップロードして同期しますか？`
            );

            if (shouldSync) {
                const success = await storage.uploadLocalDataToFirestore();
                if (success) {
                    ui.showToast('データをクラウドにアップロードしました！', 'success');
                    await this.refreshData();
                } else {
                    ui.showToast('アップロードに失敗しました', 'error');
                }
            }
        }
    }

    /**
     * Googleログイン処理
     */
    async handleLogin() {
        try {
            await firebaseAuth.signInWithGoogle();
            ui.showToast('ログインしました！', 'success');
        } catch (error) {
            console.error('Login error:', error);
            ui.showToast('ログインに失敗しました: ' + error.message, 'error');
        }
    }

    /**
     * ログアウト処理
     */
    async handleLogout() {
        try {
            await firebaseAuth.signOut();
            ui.showToast('ログアウトしました', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            ui.showToast('ログアウトに失敗しました', 'error');
        }
    }

    /**
     * データを再読み込みしてUIを更新
     */
    async refreshData() {
        await ui.refreshAll();
    }

    /**
     * イベントリスナーを設定
     */
    bindEvents() {
        document.addEventListener('DOMContentLoaded', async () => {
            // 初期のログインボタンにイベントを設定（Firebase auth状態確認前）
            const initialLoginBtn = document.getElementById('btn-login');
            if (initialLoginBtn) {
                initialLoginBtn.addEventListener('click', () => this.handleLogin());
            }

            // ===================================
            // ヘッダーボタン
            // ===================================
            document.getElementById('btn-add-subscription').addEventListener('click', () => ui.openAddModal());
            document.getElementById('btn-exchange-rate').addEventListener('click', () => ui.openExchangeRateModal());
            document.getElementById('btn-add-first')?.addEventListener('click', () => ui.openAddModal());

            // ===================================
            // サブスクモーダル
            // ===================================
            document.getElementById('btn-close-subscription').addEventListener('click', () => ui.closeModal('modal-subscription'));
            document.getElementById('btn-cancel-subscription').addEventListener('click', () => ui.closeModal('modal-subscription'));
            document.getElementById('form-subscription').addEventListener('submit', (e) => {
                e.preventDefault();
                ui.handleFormSubmit();
            });

            // フォームプレビュー更新
            ['amount-original', 'currency', 'billing-cycle'].forEach(id => {
                document.getElementById(id).addEventListener('change', () => ui.updateFormPreview());
                document.getElementById(id).addEventListener('input', () => ui.updateFormPreview());
            });

            // ===================================
            // 削除確認モーダル
            // ===================================
            document.getElementById('btn-close-delete').addEventListener('click', () => ui.closeModal('modal-delete-confirm'));
            document.getElementById('btn-cancel-delete').addEventListener('click', () => ui.closeModal('modal-delete-confirm'));
            document.getElementById('btn-confirm-delete').addEventListener('click', () => ui.handleDelete());

            // ===================================
            // 為替レートモーダル
            // ===================================
            document.getElementById('btn-close-exchange').addEventListener('click', () => ui.closeModal('modal-exchange-rate'));
            document.getElementById('btn-save-rate').addEventListener('click', () => ui.saveExchangeRate());
            document.getElementById('btn-fetch-rate').addEventListener('click', () => ui.fetchExchangeRate());

            // ===================================
            // API設定モーダル
            // ===================================
            document.getElementById('btn-ai-settings').addEventListener('click', () => ui.openApiSettingsModal());
            document.getElementById('btn-close-api').addEventListener('click', () => ui.closeModal('modal-api-settings'));
            document.getElementById('btn-cancel-api').addEventListener('click', () => ui.closeModal('modal-api-settings'));
            document.getElementById('btn-save-api').addEventListener('click', () => ui.saveApiSettings());

            // ===================================
            // AIアドバイザー
            // ===================================
            document.getElementById('btn-ask-ai').addEventListener('click', () => ui.askAI());

            // ===================================
            // テーブルフィルター
            // ===================================
            document.getElementById('filter-category').addEventListener('change', () => ui.filterTable());
            document.getElementById('filter-cycle').addEventListener('change', () => ui.filterTable());

            // テーブルソート
            document.querySelectorAll('.subscription-table th.sortable').forEach(th => {
                th.addEventListener('click', () => ui.sortTable(th.dataset.sort));
            });

            // モーダル背景クリックで閉じる
            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        ui.closeAllModals();
                    }
                });
            });

            // 初期データ読み込み
            await ui.refreshAll();
        });
    }
}

// アプリケーションを初期化
const app = new SubscManApp();
