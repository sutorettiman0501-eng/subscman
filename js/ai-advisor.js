/**
 * SubscMan - AIアドバイザーモジュール
 * Google Gemini APIを使ったサブスク見直しアドバイス機能
 * API接続失敗時はローカルアドバイザーにフォールバック
 */

class AIAdvisor {
    constructor() {
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    }

    /**
     * サブスクリプション一覧からサマリーテキストを生成
     * @param {Array} subscriptions - サブスクリプション配列
     * @returns {string} サマリーテキスト
     */
    generateSubscriptionsSummary(subscriptions) {
        if (subscriptions.length === 0) {
            return '現在、登録されているサブスクはありません。';
        }

        const totalMonthly = calculator.getTotalMonthly(subscriptions);
        const totalYearly = calculator.getTotalYearly(subscriptions);

        let summary = `【合計】月額 ${calculator.formatJPY(totalMonthly)} / 年額 ${calculator.formatJPY(totalYearly)}\n\n`;
        summary += '【サービス一覧】\n';

        // カテゴリ別にグループ化
        const byCategory = {};
        subscriptions.forEach(sub => {
            const cat = sub.category || 'その他';
            if (!byCategory[cat]) {
                byCategory[cat] = [];
            }
            byCategory[cat].push(sub);
        });

        // カテゴリ別に出力
        Object.keys(byCategory).forEach(category => {
            const subs = byCategory[category];
            const categoryTotal = subs.reduce((sum, s) => sum + s.amount_jpy_monthly, 0);
            summary += `\n■ ${category}（月額計: ${calculator.formatJPY(categoryTotal)}）\n`;

            subs.forEach(sub => {
                summary += `  - ${sub.service_name}: ${calculator.formatJPY(sub.amount_jpy_monthly)}/月`;
                if (sub.billing_cycle === '年払い') {
                    summary += `（年払い ${calculator.formatJPY(sub.amount_jpy_yearly)}）`;
                }
                summary += '\n';
            });
        });

        return summary;
    }

    /**
     * AIアドバイス用のプロンプトを構築
     * @param {string} subscriptionsSummary - サブスクサマリー
     * @param {string} userInput - ユーザーからの相談内容
     * @returns {string} 完全なプロンプト
     */
    buildPrompt(subscriptionsSummary, userInput) {
        return `あなたは家計の見直しをサポートする『サブスク専門のファイナンシャルアドバイザー』です。

# 利用者のサブスク一覧データ（円換算済み）
${subscriptionsSummary}

# ユーザーからの相談内容
${userInput}

# 役割
- サブスクの無駄を見つける
- 解約候補を提案する
- 『やめる』『減らす』『そのまま』の3分類で考える
- 年額・月額の両方の観点からアドバイスする
- 特に「AI」カテゴリのサブスクは、似た機能の重複に注意する
- できるだけ優しい口調で、日本語で回答する

# 出力フォーマット
1. 全体のコメント
2. 解約・見直し候補リスト
3. 節約インパクトのまとめ（◯円／月・◯円／年）
4. 最後に一言背中を押すメッセージ`;
    }

    /**
     * ローカルのシンプルなアドバイス機能（API不要）
     * @returns {string} アドバイステキスト
     */
    getLocalAdvice() {
        const subscriptions = storage.getSubscriptions(true);

        if (subscriptions.length === 0) {
            return '📝 まだサブスクが登録されていません。「＋追加する」ボタンからサブスクを登録してください。';
        }

        const totalMonthly = calculator.getTotalMonthly(subscriptions);
        const totalYearly = calculator.getTotalYearly(subscriptions);
        const breakdown = calculator.getCategoryBreakdown(subscriptions);

        let advice = '📊 **あなたのサブスク分析レポート**\n\n';

        // 総額
        advice += `💰 **月額合計**: ${calculator.formatJPY(totalMonthly)}\n`;
        advice += `📅 **年額合計**: ${calculator.formatJPY(totalYearly)}\n\n`;

        // カテゴリ別分析
        advice += '📂 **カテゴリ別内訳**:\n';
        const sortedCategories = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
        sortedCategories.forEach(([category, amount]) => {
            const percent = Math.round((amount / totalMonthly) * 100);
            advice += `  • ${category}: ${calculator.formatJPY(amount)}/月（${percent}%）\n`;
        });
        advice += '\n';

        // 見直しポイント
        advice += '💡 **見直しポイント**:\n\n';

        // AI系の重複チェック
        const aiSubs = subscriptions.filter(s => s.category === 'AI');
        if (aiSubs.length >= 2) {
            const aiTotal = aiSubs.reduce((sum, s) => sum + s.amount_jpy_monthly, 0);
            advice += `⚠️ **AIサブスクが${aiSubs.length}件重複しています**\n`;
            advice += `   合計: ${calculator.formatJPY(aiTotal)}/月\n`;
            advice += `   サービス: ${aiSubs.map(s => s.service_name).join('、')}\n`;
            advice += `   → 機能が重複していないか確認しましょう\n\n`;
        }

        // 高額サブスクチェック（月額3000円以上）
        const expensive = subscriptions.filter(s => s.amount_jpy_monthly >= 3000);
        if (expensive.length > 0) {
            advice += `💸 **高額サブスク（月額3,000円以上）**\n`;
            expensive.forEach(s => {
                advice += `   • ${s.service_name}: ${calculator.formatJPY(s.amount_jpy_monthly)}/月\n`;
            });
            advice += `   → 本当に必要か見直してみましょう\n\n`;
        }

        // 年払いの月換算チェック
        const yearlyPlans = subscriptions.filter(s => s.billing_cycle === '年払い');
        if (yearlyPlans.length > 0) {
            advice += `📆 **年払いプラン（${yearlyPlans.length}件）**\n`;
            yearlyPlans.forEach(s => {
                advice += `   • ${s.service_name}: ${calculator.formatJPY(s.amount_jpy_yearly)}/年 → 月換算 ${calculator.formatJPY(s.amount_jpy_monthly)}\n`;
            });
            advice += `   → 更新前に本当に使っているか確認しましょう\n\n`;
        }

        // エンタメ系のチェック
        const entertainment = subscriptions.filter(s => s.category === 'エンタメ');
        if (entertainment.length >= 3) {
            const entTotal = entertainment.reduce((sum, s) => sum + s.amount_jpy_monthly, 0);
            advice += `🎬 **エンタメ系が${entertainment.length}件**\n`;
            advice += `   合計: ${calculator.formatJPY(entTotal)}/月\n`;
            advice += `   → 同時に全部見ていますか？使っていないものは解約を検討\n\n`;
        }

        // 節約ポテンシャル（仮に20%削減を提案）
        const savingPotential = Math.round(totalMonthly * 0.2);
        advice += `✨ **節約の可能性**\n`;
        advice += `   見直しで約20%削減できれば...\n`;
        advice += `   月 ${calculator.formatJPY(savingPotential)} / 年 ${calculator.formatJPY(savingPotential * 12)} の節約に！\n\n`;

        advice += '---\n';
        advice += '💪 小さな見直しの積み重ねが、大きな節約につながります。まずは1つ、使っていないサブスクを解約してみましょう！';

        return advice;
    }

    /**
     * Google Gemini APIを呼び出してアドバイスを取得
     * @param {string} userInput - ユーザーからの相談内容
     * @param {string} apiKey - Google API キー
     * @returns {Promise<string>} AIからの回答
     */
    async getAdvice(userInput, apiKey) {
        // APIキーがない場合はローカルアドバイスを返す
        if (!apiKey || apiKey.trim() === '') {
            return this.getLocalAdvice();
        }

        // サブスク一覧を取得
        const subscriptions = storage.getSubscriptions(true);

        // サマリーを生成
        const summary = this.generateSubscriptionsSummary(subscriptions);

        // プロンプトを構築
        const prompt = this.buildPrompt(summary, userInput);

        // Gemini API リクエスト
        const url = `${this.apiEndpoint}?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                const errorMessage = error.error?.message || '';

                // APIエラーの場合はローカルアドバイスにフォールバック
                console.warn('Gemini API error:', errorMessage);
                return this.getLocalAdvice() + '\n\n---\n⚠️ AI機能は現在利用できません。上記はローカル分析結果です。';
            }

            const data = await response.json();

            // Gemini APIのレスポンス形式から回答を抽出
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            }

            // 応答がない場合もローカルにフォールバック
            return this.getLocalAdvice();

        } catch (error) {
            console.warn('Gemini API fetch error:', error);
            return this.getLocalAdvice() + '\n\n---\n⚠️ AI機能は現在利用できません。上記はローカル分析結果です。';
        }
    }

    /**
     * APIキーが設定されているかチェック
     * @returns {boolean} 設定済みかどうか
     */
    hasApiKey() {
        const key = storage.getApiKey();
        return key && key.length > 0;
    }
}

// グローバルインスタンスを作成
const aiAdvisor = new AIAdvisor();
