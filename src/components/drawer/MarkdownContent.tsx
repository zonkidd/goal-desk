import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose max-w-none text-theme-primary prose-headings:text-theme-primary prose-p:text-theme-primary prose-strong:text-theme-primary prose-li:text-theme-primary prose-code:text-theme-primary prose-a:text-theme-accent prose-headings:tracking-tight prose-code:before:hidden prose-code:after:hidden">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
