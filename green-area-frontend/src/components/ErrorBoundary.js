import { Component } from 'react';

// Stops a render error in one panel/tab from white-screening the whole app.
// Pass a `resetKey` (e.g. `${province}:${tab}`) so switching tab/province
// auto-clears a stuck error and re-renders the children.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Panel render error:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert">
          <p className="helper">เกิดข้อผิดพลาดในการแสดงผลส่วนนี้ — ส่วนอื่นยังใช้งานได้ตามปกติ</p>
          <button className="btn--text" onClick={() => this.setState({ error: null })}>
            ลองแสดงผลอีกครั้ง
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
