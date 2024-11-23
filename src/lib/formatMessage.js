// src/utils/formatMessage.js
export const formatMessage = (content) => {
    // 箇条書きの検出と整形
    if (content.includes('1.') || content.includes('*') || content.includes('-')) {
      return content.split('\n').map((line, i) => {
        // 番号付きリストの処理
        if (line.match(/^\d+\./)) {
          return `\n${line}\n`;
        }
        // 箇条書きの処理
        if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
          return `  ${line}\n`;
        }
        // 見出しの処理
        if (line.includes(':**')) {
          return `\n${line}\n`;
        }
        return line;
      }).join('\n');
    }
    
    // コードブロックの処理
    if (content.includes('```')) {
      return content.split('```').map((block, i) => {
        if (i % 2 === 1) { // コードブロック内
          return `\n\`\`\`${block}\`\`\`\n`;
        }
        return block;
      }).join('');
    }
  
    return content;
  };