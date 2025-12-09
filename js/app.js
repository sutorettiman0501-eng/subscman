/**
 * SubscMan - メインアプリケーション
 * イベントリスナーの設定とアプリ初期化
 */

class SubscManApp {
    constructor() {
        this.init();
    }

    /**
     * アプリケーション初期化
     */
    init() {
        // DOM読み込み完了後に実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * セットアップ処理
     */
    setup() {
        this.attachEventListeners();
        ui.refreshAll();

        // 初回起動時にサンプルデータを投入するか確認
        const subscriptions = storage.getSubscriptions(false);
        if (subscriptions.length === 0) {
            this.showWelcomePrompt();
        }
    }

    /**
     * 初回起動時のウェルカムプロンプト
     */
    showWelcomePrompt() {
        // 少し遅延させて表示
        setTimeout(() => {
            const loadSample = confirm(
                'SubscMan へようこそ！\n\n' +
                'サンプルデータを読み込んでアプリの使い方を確認しますか？\n' +
                '（後で削除できます）'
            );

            if (loadSample) {
                storage.loadSampleData();
                ui.refreshAll();
                ui.showToast('サンプルデータを読み込みました', 'success');
            }
        }, 500);
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
        // ===================================
        // ヘッダーボタン
        // ===================================

        // 追加ボタン
        document.getElementById('btn-add-subscription').addEventListener('click', () => {
            ui.openAddModal();
        });

        // 為替レート設定ボタン
        document.getElementById('btn-exchange-rate').addEventListener('click', () => {
            ui.openExchangeRateModal();
        });

        // 空状態の追加ボタン
        document.getElementById('btn-add-first')?.addEventListener('click', () => {
            ui.openAddModal();
        });

        // ===================================
        // サブスクモーダル
        // ===================================

        // 閉じるボタン
        document.getElementById('btn-close-subscription').addEventListener('click', () => {
            ui.closeModal('modal-subscription');
        });

        // キャンセルボタン
        document.getElementById('btn-cancel-subscription').addEventListener('click', () => {
            ui.closeModal('modal-subscription');
        });

        // フォーム送信
        document.getElementById('form-subscription').addEventListener('submit', (e) => {
            e.preventDefault();
            ui.handleFormSubmit();
        });

        // フォームの変更でプレビュー更新
        ['amount-original', 'currency', 'billing-cycle'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                ui.updateFormPreview();
            });
            document.getElementById(id).addEventListener('change', () => {
                ui.updateFormPreview();
            });
        });

        // ===================================
        // 為替レートモーダル
        // ===================================

        // 閉じるボタン
        document.getElementById('btn-close-exchange').addEventListener('click', () => {
            ui.closeModal('modal-exchange-rate');
        });

        // 保存ボタン
        document.getElementById('btn-save-rate').addEventListener('click', () => {
            ui.saveExchangeRate();
        });

        // 最新を取得ボタン
        document.getElementById('btn-fetch-rate').addEventListener('click', () => {
            ui.fetchExchangeRate();
        });

        // ===================================
        // 削除確認モーダル
        // ===================================

        // 閉じるボタン
        document.getElementById('btn-close-delete').addEventListener('click', () => {
            ui.closeModal('modal-delete-confirm');
        });

        // キャンセルボタン
        document.getElementById('btn-cancel-delete').addEventListener('click', () => {
            ui.closeModal('modal-delete-confirm');
        });

        // 削除実行ボタン
        document.getElementById('btn-confirm-delete').addEventListener('click', () => {
            ui.handleDelete();
        });

        // ===================================
        // API設定モーダル
        // ===================================

        // 閉じるボタン
        document.getElementById('btn-close-api').addEventListener('click', () => {
            ui.closeModal('modal-api-settings');
        });

        // キャンセルボタン
        document.getElementById('btn-cancel-api').addEventListener('click', () => {
            ui.closeModal('modal-api-settings');
        });

        // 保存ボタン
        document.getElementById('btn-save-api').addEventListener('click', () => {
            ui.saveApiSettings();
        });

        // ===================================
        // AIアドバイザー
        // ===================================

        // 相談ボタン
        document.getElementById('btn-ask-ai').addEventListener('click', () => {
            ui.askAI();
        });

        // API設定ボタン
        document.getElementById('btn-ai-settings').addEventListener('click', () => {
            ui.openApiSettingsModal();
        });

        // Enter + Cmd/Ctrl で送信
        document.getElementById('ai-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                ui.askAI();
            }
        });

        // ===================================
        // テーブル操作
        // ===================================

        // ソート
        document.querySelectorAll('.subscription-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                ui.sortTable(column);
            });
        });

        // フィルタ
        document.getElementById('filter-category').addEventListener('change', () => {
            ui.filterTable();
        });

        document.getElementById('filter-cycle').addEventListener('change', () => {
            ui.filterTable();
        });

        // ===================================
        // モーダル背景クリックで閉じる
        // ===================================

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    ui.closeAllModals();
                }
            });
        });

        // ===================================
        // ESCキーでモーダルを閉じる
        // ===================================

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ui.closeAllModals();
            }
        });
    }
}

// アプリケーション起動
const app = new SubscManApp();
