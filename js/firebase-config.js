/**
 * SubscMan - Firebase 設定ファイル
 * Firebase認証とFirestoreの初期化
 */

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyCcv0zC-uQ4AvL18CjcDTMVIKn1CJqgoJI",
    authDomain: "subscman-746fb.firebaseapp.com",
    projectId: "subscman-746fb",
    storageBucket: "subscman-746fb.firebasestorage.app",
    messagingSenderId: "959307916950",
    appId: "1:959307916950:web:3926b5e8b4505b235244b7"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// サービスのインスタンス
const auth = firebase.auth();
const db = firebase.firestore();

// Google認証プロバイダー
const googleProvider = new firebase.auth.GoogleAuthProvider();

/**
 * Firebase認証管理クラス
 */
class FirebaseAuth {
    constructor() {
        this.currentUser = null;
        this.onAuthStateChangedCallbacks = [];
    }

    /**
     * 認証状態の変化を監視
     * @param {Function} callback - コールバック関数
     */
    onAuthStateChanged(callback) {
        this.onAuthStateChangedCallbacks.push(callback);
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            callback(user);
        });
    }

    /**
     * Googleでログイン
     * @returns {Promise<Object>} ユーザー情報
     */
    async signInWithGoogle() {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            return result.user;
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    }

    /**
     * ログアウト
     */
    async signOut() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    /**
     * 現在のユーザーを取得
     * @returns {Object|null} ユーザー情報
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * ログイン済みかどうか
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }
}

// グローバルインスタンス
const firebaseAuth = new FirebaseAuth();
