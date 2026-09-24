import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, fontFamily: 'sans-serif', padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f3439' }}>حدث خطأ</h1>
          <p style={{ color: 'rgba(31,52,57,.6)' }}>
            {this.state.error?.message || 'Something went wrong'}
          </p>
          <button onClick={() => location.reload()} style={{ padding: '10px 24px', borderRadius: 9999, background: '#ed6b4c', color: '#fff4e4', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
