/**
 * SubscMan - UI操作モジュール
 * ダッシュボード更新、モーダル制御、テーブル操作を担当
 */

class SubscManUI {
    constructor() {
        this.chart = null;
        this.currentSort = { column: 'monthly', direction: 'desc' };
        this.currentFilters = { category: '', cycle: '' };

        // カテゴリ別の色
        this.categoryColors = {
            'エンタメ': '#ec4899',
            '仕事': '#3b82f6',
            '教育': '#10b981',
            '生活': '#f59e0b',
            'AI': '#8b5cf6',
            'その他': '#64748b'
        };
    }

    // ===================================
    // ダッシュボード更新
    // ===================================

    /**
     * サマリーカードを更新
     */
    async updateSummaryCards() {
        const subscriptions = await storage.getSubscriptions(true);

        const totalMonthly = calculator.getTotalMonthly(subscriptions);
        const totalYearly = calculator.getTotalYearly(subscriptions);
        const totalCount = subscriptions.length;

        document.getElementById('total-monthly').textContent = calculator.formatJPY(totalMonthly);
        document.getElementById('total-yearly').textContent = calculator.formatJPY(totalYearly);
        document.getElementById('total-count').textContent = totalCount + '件';
    }

    /**
     * カテゴリ別円グラフを更新
     */
    async updateCategoryChart() {
        const subscriptions = await storage.getSubscriptions(true);
        const breakdown = calculator.getCategoryBreakdown(subscriptions);

        const labels = Object.keys(breakdown);
        const data = Object.values(breakdown);
        const colors = labels.map(label => this.categoryColors[label] || '#64748b');

        const ctx = document.getElementById('category-chart').getContext('2d');

        // 既存のチャートを破棄
        if (this.chart) {
            this.chart.destroy();
        }

        // データがない場合
        if (labels.length === 0) {
            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['データなし'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e2e8f0'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });
            document.getElementById('chart-legend').innerHTML = '<p style="color: #94a3b8; font-size: 0.875rem;">データがありません</p>';
            return;
        }

        // チャートを作成
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ¥${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // カスタム凡例を作成
        const legendHtml = labels.map((label, index) => {
            const value = data[index];
            const color = colors[index];
            return `<div class="legend-item">
                <span class="legend-color" style="background-color: ${color}"></span>
                <span>${label}: ${calculator.formatJPY(value)}</span>
            </div>`;
        }).join('');

        document.getElementById('chart-legend').innerHTML = legendHtml;
    }

    /**
     * サブスク一覧テーブルを更新
     */
    async updateSubscriptionTable() {
        const subscriptions = await storage.getSubscriptions(true);
        const tbody = document.getElementById('subscription-tbody');
        const emptyState = document.getElementById('empty-state');

        // フィルタリング
        let filtered = subscriptions.filter(sub => {
            if (this.currentFilters.category && sub.category !== this.currentFilters.category) {
                return false;
            }
            if (this.currentFilters.cycle && sub.billing_cycle !== this.currentFilters.cycle) {
                return false;
            }
            return true;
        });

        // ソート
        filtered.sort((a, b) => {
            let valueA, valueB;

            if (this.currentSort.column === 'monthly') {
                valueA = a.amount_jpy_monthly;
                valueB = b.amount_jpy_monthly;
            } else if (this.currentSort.column === 'original') {
                valueA = a.amount_original;
                valueB = b.amount_original;
            }

            if (this.currentSort.direction === 'desc') {
                return valueB - valueA;
            } else {
                return valueA - valueB;
            }
        });

        // 空状態の表示制御
        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.add('visible');
            return;
        } else {
            emptyState.classList.remove('visible');
        }

        // テーブル行を生成
        tbody.innerHTML = filtered.map(sub => this.createTableRow(sub)).join('');

        // 編集・削除ボタンのイベントを設定
        this.attachTableEventListeners();
    }

    /**
     * テーブル行のHTMLを生成
     * @param {Object} sub - サブスクリプションオブジェクト
     * @returns {string} HTML文字列
     */
    createTableRow(sub) {
        const originalAmount = calculator.formatOriginalAmount(sub.amount_original, sub.currency);
        const monthlyAmount = calculator.formatJPY(sub.amount_jpy_monthly);
        const startDate = sub.start_date ? this.formatDate(sub.start_date) : '-';
        const nextBillingDate = sub.next_billing_date ? this.formatDate(sub.next_billing_date) : '-';

        return `<tr data-id="${sub.id}">
            <td data-label="サービス名">
                <span class="service-name">${this.escapeHtml(sub.service_name)}</span>
            </td>
            <td data-label="元の金額">
                <span class="amount-original">${originalAmount}</span>
            </td>
            <td data-label="月額（円）">
                <span class="amount-monthly">${monthlyAmount}</span>
            </td>
            <td data-label="カテゴリ">
                <span class="category-badge ${sub.category}">${sub.category}</span>
            </td>
            <td data-label="サイクル">
                <span class="cycle-badge ${sub.billing_cycle}">${sub.billing_cycle}</span>
            </td>
            <td data-label="開始日">${startDate}</td>
            <td data-label="次回請求日">${nextBillingDate}</td>
            <td data-label="アクション">
                <div class="actions-cell">
                    <button class="btn btn-action edit" data-id="${sub.id}" title="編集">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn btn-action delete" data-id="${sub.id}" title="削除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }

    /**
     * テーブルの編集・削除ボタンにイベントリスナーを設定
     */
    attachTableEventListeners() {
        // 編集ボタン
        document.querySelectorAll('.btn-action.edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.openEditModal(id);
            });
        });

        // 削除ボタン
        document.querySelectorAll('.btn-action.delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.openDeleteConfirm(id);
            });
        });
    }

    /**
     * 全UIを更新
     */
    async refreshAll() {
        await this.updateSummaryCards();
        await this.updateCategoryChart();
        await this.updateSubscriptionTable();
        await this.updateExchangeRateDisplay();
    }

    // ===================================
    // モーダル制御
    // ===================================

    /**
     * 追加モーダルを開く
     */
    openAddModal() {
        document.getElementById('modal-subscription-title').textContent = 'サブスクを追加';
        document.getElementById('form-subscription').reset();
        document.getElementById('edit-id').value = '';
        this.updateFormPreview();
        this.openModal('modal-subscription');
    }

    /**
     * 編集モーダルを開く
     * @param {string} id - サブスクリプションID
     */
    async openEditModal(id) {
        const sub = await storage.getSubscriptionById(id);
        if (!sub) {
            this.showToast('サブスクが見つかりません', 'error');
            return;
        }

        document.getElementById('modal-subscription-title').textContent = 'サブスクを編集';
        document.getElementById('edit-id').value = id;
        document.getElementById('service-name').value = sub.service_name;
        document.getElementById('amount-original').value = sub.amount_original;
        document.getElementById('currency').value = sub.currency;
        document.getElementById('billing-cycle').value = sub.billing_cycle;
        document.getElementById('category').value = sub.category;
        document.getElementById('start-date').value = sub.start_date || '';
        document.getElementById('next-billing-date').value = sub.next_billing_date || '';
        document.getElementById('memo').value = sub.memo || '';

        this.updateFormPreview();
        this.openModal('modal-subscription');
    }

    /**
     * 削除確認モーダルを開く
     * @param {string} id - サブスクリプションID
     */
    async openDeleteConfirm(id) {
        const sub = await storage.getSubscriptionById(id);
        if (!sub) {
            this.showToast('サブスクが見つかりません', 'error');
            return;
        }

        document.getElementById('delete-service-name').textContent = sub.service_name;
        document.getElementById('delete-id').value = id;
        this.openModal('modal-delete-confirm');
    }

    /**
     * 為替レート設定モーダルを開く
     */
    openExchangeRateModal() {
        this.updateExchangeRateDisplay();
        document.getElementById('new-rate').value = '';
        this.openModal('modal-exchange-rate');
    }

    /**
     * API設定モーダルを開く
     */
    openApiSettingsModal() {
        const apiKey = storage.getApiKey();
        document.getElementById('api-key').value = apiKey || '';
        this.openModal('modal-api-settings');
    }

    /**
     * モーダルを開く
     * @param {string} modalId - モーダルのID
     */
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * モーダルを閉じる
     * @param {string} modalId - モーダルのID
     */
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * 全モーダルを閉じる
     */
    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    // ===================================
    // フォーム処理
    // ===================================

    /**
     * フォームのプレビューを更新
     */
    async updateFormPreview() {
        const amountOriginal = parseFloat(document.getElementById('amount-original').value) || 0;
        const currency = document.getElementById('currency').value;
        const billingCycle = document.getElementById('billing-cycle').value;

        const settings = await storage.getSettings();
        const amounts = calculator.calculateAmounts({
            amount_original: amountOriginal,
            currency: currency,
            billing_cycle: billingCycle
        }, settings.usd_to_jpy_rate);

        document.getElementById('preview-monthly').textContent = calculator.formatJPY(amounts.amount_jpy_monthly);
        document.getElementById('preview-yearly').textContent = calculator.formatJPY(amounts.amount_jpy_yearly);
    }

    /**
     * サブスクフォームを送信
     */
    async handleFormSubmit() {
        const form = document.getElementById('form-subscription');
        const editId = document.getElementById('edit-id').value;

        const data = {
            service_name: document.getElementById('service-name').value.trim(),
            amount_original: parseFloat(document.getElementById('amount-original').value),
            currency: document.getElementById('currency').value,
            billing_cycle: document.getElementById('billing-cycle').value,
            category: document.getElementById('category').value,
            start_date: document.getElementById('start-date').value || null,
            next_billing_date: document.getElementById('next-billing-date').value || null,
            memo: document.getElementById('memo').value.trim()
        };

        // バリデーション
        if (!data.service_name) {
            this.showToast('サービス名を入力してください', 'error');
            return;
        }
        if (isNaN(data.amount_original) || data.amount_original <= 0) {
            this.showToast('金額を正しく入力してください', 'error');
            return;
        }

        // 金額を計算
        const settings = await storage.getSettings();
        const amounts = calculator.calculateAmounts(data, settings.usd_to_jpy_rate);
        data.amount_jpy_monthly = amounts.amount_jpy_monthly;
        data.amount_jpy_yearly = amounts.amount_jpy_yearly;

        if (editId) {
            // 更新
            await storage.updateSubscription(editId, data);
            this.showToast('サブスクを更新しました', 'success');
        } else {
            // 新規追加
            await storage.addSubscription(data);
            this.showToast('サブスクを追加しました', 'success');
        }

        this.closeModal('modal-subscription');
        await this.refreshAll();
    }

    /**
     * サブスクを削除
     */
    async handleDelete() {
        const id = document.getElementById('delete-id').value;

        // 物理削除を実行
        const result = await storage.deleteSubscription(id);

        if (result) {
            this.showToast('サブスクを削除しました', 'success');
        } else {
            this.showToast('削除に失敗しました', 'error');
        }

        this.closeModal('modal-delete-confirm');
        await this.refreshAll();
    }

    // ===================================
    // 為替レート
    // ===================================

    /**
     * 為替レート表示を更新
     */
    async updateExchangeRateDisplay() {
        const settings = await storage.getSettings();
        document.getElementById('current-rate').textContent = settings.usd_to_jpy_rate.toFixed(2);

        const lastUpdated = settings.last_updated
            ? this.formatDateTime(settings.last_updated)
            : '--';
        document.getElementById('rate-updated').textContent = '最終更新: ' + lastUpdated;
    }

    /**
     * 為替レートを手動で保存
     */
    async saveExchangeRate() {
        const newRate = parseFloat(document.getElementById('new-rate').value);

        if (isNaN(newRate) || newRate <= 0) {
            this.showToast('有効なレートを入力してください', 'error');
            return;
        }

        await storage.updateExchangeRate(newRate);
        this.showToast('為替レートを更新しました', 'success');
        this.closeModal('modal-exchange-rate');
        await this.refreshAll();
    }

    /**
     * 外部APIから為替レートを取得
     */
    async fetchExchangeRate() {
        const btn = document.getElementById('btn-fetch-rate');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="ai-loading-spinner" style="width: 16px; height: 16px;"></span> 取得中...';
        btn.disabled = true;

        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

            if (!response.ok) {
                throw new Error('API呼び出しに失敗しました');
            }

            const data = await response.json();
            const rate = data.rates.JPY;

            if (!rate) {
                throw new Error('レートが取得できませんでした');
            }

            await storage.updateExchangeRate(rate);
            await this.updateExchangeRateDisplay();
            this.showToast(`為替レートを更新しました: ${rate.toFixed(2)} 円/ドル`, 'success');

        } catch (error) {
            console.error('為替レート取得エラー:', error);
            this.showToast('為替レートの取得に失敗しました。手動で入力してください。', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // ===================================
    // AI アドバイザー
    // ===================================

    /**
     * AI に相談する
     */
    async askAI() {
        const userInput = document.getElementById('ai-input').value.trim();
        const responseContainer = document.getElementById('ai-response');

        if (!userInput) {
            this.showToast('相談内容を入力してください', 'error');
            return;
        }

        // APIキーをチェック
        if (!aiAdvisor.hasApiKey()) {
            this.openApiSettingsModal();
            this.showToast('AIを使用するにはAPIキーが必要です', 'warning');
            return;
        }

        // ローディング表示
        responseContainer.innerHTML = `
            <div class="ai-loading">
                <div class="ai-loading-spinner"></div>
            </div>
        `;

        try {
            const apiKey = storage.getApiKey();
            const advice = await aiAdvisor.getAdvice(userInput, apiKey);

            responseContainer.innerHTML = `
                <div class="ai-response-content">${this.escapeHtml(advice)}</div>
            `;

        } catch (error) {
            console.error('AI アドバイスエラー:', error);
            responseContainer.innerHTML = `
                <div class="ai-placeholder" style="color: var(--danger);">
                    <p>エラーが発生しました<br>${this.escapeHtml(error.message)}</p>
                </div>
            `;
            this.showToast('AIからの回答取得に失敗しました', 'error');
        }
    }

    /**
     * API設定を保存
     */
    saveApiSettings() {
        const apiKey = document.getElementById('api-key').value.trim();

        if (apiKey) {
            storage.setApiKey(apiKey);
            this.showToast('APIキーを保存しました', 'success');
        } else {
            storage.removeApiKey();
            this.showToast('APIキーを削除しました', 'success');
        }

        this.closeModal('modal-api-settings');
    }

    // ===================================
    // ユーティリティ
    // ===================================

    /**
     * トースト通知を表示
     * @param {string} message - メッセージ
     * @param {string} type - タイプ（'success', 'error', 'warning'）
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // 3秒後に削除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * HTMLエスケープ
     * @param {string} text - テキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 日付をフォーマット
     * @param {string} dateStr - 日付文字列
     * @returns {string} フォーマット済み日付
     */
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    /**
     * 日時をフォーマット
     * @param {string} dateTimeStr - 日時文字列
     * @returns {string} フォーマット済み日時
     */
    formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '-';
        const date = new Date(dateTimeStr);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * テーブルをソート
     * @param {string} column - ソートするカラム
     */
    sortTable(column) {
        if (this.currentSort.column === column) {
            // 同じカラムなら方向を反転
            this.currentSort.direction = this.currentSort.direction === 'desc' ? 'asc' : 'desc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'desc';
        }

        // ソートアイコンを更新
        document.querySelectorAll('.subscription-table th.sortable').forEach(th => {
            th.classList.remove('active');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.textContent = '';
        });

        const activeHeader = document.querySelector(`.subscription-table th[data-sort="${column}"]`);
        if (activeHeader) {
            activeHeader.classList.add('active');
            const icon = activeHeader.querySelector('.sort-icon');
            if (icon) {
                icon.textContent = this.currentSort.direction === 'desc' ? '▼' : '▲';
            }
        }

        this.updateSubscriptionTable();
    }

    /**
     * テーブルをフィルタ
     */
    filterTable() {
        this.currentFilters.category = document.getElementById('filter-category').value;
        this.currentFilters.cycle = document.getElementById('filter-cycle').value;
        this.updateSubscriptionTable();
    }
}

// グローバルインスタンスを作成
const ui = new SubscManUI();
