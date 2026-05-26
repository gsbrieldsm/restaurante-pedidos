import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso — Menuê+',
  description: 'Termos de Uso e Política de Privacidade da plataforma Menuê+.',
}

export default function TermosPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F0FAFA' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-sm font-black text-white">M+</span>
            </div>
            <p className="text-xs font-bold tracking-widest uppercase text-teal-300">Menuê+</p>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight">Termos de Uso</h1>
          <p className="text-white/50 text-sm mt-2">Última atualização: maio de 2025</p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-10 space-y-10 text-slate-700 text-sm leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">1. Das Partes</h2>
            <p>
              O presente instrumento é celebrado entre a <strong>Menuê+ Sistemas de Gestão</strong> ("Menuê+", "nós" ou "plataforma"),
              responsável pelo desenvolvimento e operação do sistema, e o <strong>Usuário</strong> ("você", "cliente" ou "restaurante"),
              pessoa física ou jurídica que realiza o cadastro e utiliza os serviços oferecidos.
            </p>
            <p className="mt-3">
              Ao clicar em <strong>"Começar trial gratuito"</strong>, você declara ter lido, compreendido e aceitado integralmente estes Termos de Uso.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">2. O que é o Menuê+</h2>
            <p>O Menuê+ é uma plataforma SaaS (software como serviço) de gestão para restaurantes, bares e estabelecimentos alimentícios. Oferece recursos como:</p>
            <ul className="mt-3 space-y-1 list-disc list-inside text-slate-600">
              <li>Cardápio digital via QR Code</li>
              <li>Recebimento de pedidos em tempo real</li>
              <li>Gestão de mesas, garçons e estações de preparo</li>
              <li>Relatórios financeiros e de performance</li>
              <li>Controle de equipe e acesso por perfil</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">3. Trial Gratuito</h2>
            <div className="space-y-3">
              <p><strong>3.1.</strong> Ao se cadastrar, o usuário tem acesso gratuito à plataforma por <strong>7 (sete) dias corridos</strong>, sem necessidade de cartão de crédito ou qualquer pagamento antecipado.</p>
              <p><strong>3.2.</strong> O trial concede acesso ao <strong>Plano Pro</strong> completo durante o período, permitindo avaliação integral das funcionalidades.</p>
              <p><strong>3.3.</strong> Ao término do trial, o acesso ao painel é suspenso automaticamente. Os dados do restaurante (cardápio, mesas, histórico) ficam preservados por <strong>30 dias</strong>, período em que o usuário pode contratar um plano e reativar o acesso.</p>
              <p><strong>3.4.</strong> Após 30 dias sem contratação, os dados poderão ser excluídos definitivamente.</p>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">4. Planos e Preços</h2>
            <div className="space-y-3">
              <p><strong>4.1.</strong> Após o trial, a continuidade do serviço está condicionada à contratação de um dos planos disponíveis:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse mt-2">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-4 py-2 border border-slate-200 font-bold text-slate-700">Plano</th>
                      <th className="text-left px-4 py-2 border border-slate-200 font-bold text-slate-700">Mesas</th>
                      <th className="text-left px-4 py-2 border border-slate-200 font-bold text-slate-700">Mensalidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="px-4 py-2 border border-slate-200">Starter</td><td className="px-4 py-2 border border-slate-200">Até 15</td><td className="px-4 py-2 border border-slate-200">R$ 397,00/mês</td></tr>
                    <tr className="bg-slate-50"><td className="px-4 py-2 border border-slate-200">Pro</td><td className="px-4 py-2 border border-slate-200">Até 30</td><td className="px-4 py-2 border border-slate-200">R$ 697,00/mês</td></tr>
                    <tr><td className="px-4 py-2 border border-slate-200">Business</td><td className="px-4 py-2 border border-slate-200">Até 60</td><td className="px-4 py-2 border border-slate-200">R$ 1.197,00/mês</td></tr>
                  </tbody>
                </table>
              </div>
              <p><strong>4.2.</strong> Os preços podem ser reajustados mediante aviso prévio de <strong>30 dias</strong> por e-mail.</p>
              <p><strong>4.3.</strong> O valor da <strong>implementação</strong> (configuração inicial, cadastro de produtos e treinamento da equipe) é de <strong>R$ 2.000,00</strong>, cobrado uma única vez ao contratar o plano, após o período de trial.</p>
              <p><strong>4.4.</strong> Planos customizados (Enterprise) são negociados individualmente.</p>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">5. Pagamento</h2>
            <div className="space-y-3">
              <p><strong>5.1.</strong> Os pagamentos são realizados mensalmente, via <strong>PIX ou cartão de crédito</strong>, conforme as opções disponíveis na plataforma.</p>
              <p><strong>5.2.</strong> O não pagamento na data acordada pode resultar na <strong>suspensão temporária</strong> do acesso após 5 dias de inadimplência, e no <strong>encerramento da conta</strong> após 30 dias.</p>
              <p><strong>5.3.</strong> Valores pagos não são reembolsáveis, salvo por falha técnica comprovada da plataforma.</p>
            </div>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">6. Responsabilidades do Usuário</h2>
            <p className="mb-3">Ao utilizar o Menuê+, o usuário se compromete a:</p>
            <div className="space-y-2">
              <p><strong>6.1.</strong> Fornecer informações verídicas no cadastro.</p>
              <p><strong>6.2.</strong> Manter suas credenciais de acesso em sigilo, sendo responsável por qualquer uso indevido da sua conta.</p>
              <p><strong>6.3.</strong> Não utilizar a plataforma para atividades ilícitas, fraudulentas ou que violem direitos de terceiros.</p>
              <p><strong>6.4.</strong> Não tentar acessar áreas restritas do sistema, realizar engenharia reversa ou comprometer a segurança da plataforma.</p>
              <p><strong>6.5.</strong> Manter o pagamento em dia para garantir a continuidade do serviço.</p>
            </div>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">7. Responsabilidades do Menuê+</h2>
            <div className="space-y-3">
              <p><strong>7.1.</strong> O Menuê+ se compromete a manter a plataforma disponível com esforço razoável, buscando <strong>99% de uptime mensal</strong>.</p>
              <p><strong>7.2.</strong> O Menuê+ não se responsabiliza por perdas operacionais, de vendas ou prejuízos indiretos decorrentes de indisponibilidade da plataforma.</p>
            </div>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">8. Dados Pessoais e LGPD</h2>
            <div className="space-y-3">
              <p><strong>8.1.</strong> O Menuê+ coleta e trata dados pessoais dos usuários e de seus clientes finais em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.</p>
              <p><strong>8.2.</strong> Os dados coletados são utilizados exclusivamente para operação da plataforma, suporte ao cliente e melhoria do serviço. Não são vendidos ou compartilhados com terceiros para fins comerciais.</p>
              <p><strong>8.3.</strong> O usuário, ao cadastrar dados de seus clientes finais (nome, contato), assume a responsabilidade como controlador de dados perante a LGPD.</p>
              <p><strong>8.4.</strong> Para exercer seus direitos previstos na LGPD (acesso, correção, exclusão de dados), entre em contato pelo e-mail <a href="mailto:contato@menue.com.br" className="text-teal-600 underline underline-offset-2">contato@menue.com.br</a>.</p>
            </div>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">9. Cancelamento</h2>
            <div className="space-y-3">
              <p><strong>9.1.</strong> O usuário pode solicitar o cancelamento do plano a qualquer momento, sem multa, com aviso prévio de <strong>10 dias úteis</strong>.</p>
              <p><strong>9.2.</strong> Após o cancelamento, o acesso é mantido até o fim do período já pago.</p>
              <p><strong>9.3.</strong> O usuário pode solicitar exportação dos seus dados (cardápio, histórico de pedidos) em até 30 dias após o cancelamento.</p>
            </div>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3">10. Disposições Gerais</h2>
            <div className="space-y-3">
              <p><strong>10.1.</strong> Estes termos são regidos pelas leis brasileiras. Eventuais disputas serão submetidas ao foro da comarca de <strong>Blumenau/SC</strong>, com renúncia a qualquer outro.</p>
              <p><strong>10.2.</strong> O Menuê+ pode atualizar estes termos a qualquer momento, notificando os usuários com <strong>30 dias de antecedência</strong> por e-mail. O uso contínuo da plataforma após esse prazo implica aceite das novas condições.</p>
              <p><strong>10.3.</strong> Em caso de dúvidas, entre em contato pelo WhatsApp <strong>(47) 98819-4822</strong> ou pelo e-mail <a href="mailto:contato@menue.com.br" className="text-teal-600 underline underline-offset-2">contato@menue.com.br</a>.</p>
            </div>
          </section>

          {/* Rodapé */}
          <div className="pt-6 border-t border-slate-100 text-center text-slate-400 text-xs">
            <p>Menuê+ Sistemas de Gestão — CNPJ 54.691.723/0001-03</p>
            <Link href="/registro" className="inline-block mt-3 text-teal-600 font-semibold underline underline-offset-2 text-sm">
              Criar minha conta →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
