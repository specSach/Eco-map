import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Eco map render error', error, info)
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-error">
          <span aria-hidden="true">🌿</span>
          <h1>Не удалось открыть Эко карту</h1>
          <p>Проверьте подключение к интернету и обновите страницу.</p>
          <button className="button" onClick={() => location.reload()}>Обновить страницу</button>
        </main>
      )
    }
    return this.props.children
  }
}
