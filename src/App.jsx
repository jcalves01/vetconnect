import React, { useState, useEffect, useContext, createContext, useRef } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { supabase } from "./lib/supabase.js";

// ── Build metadata ─────────────────────────────────────────────────────────────
const APP_VERSION = "1.0.0-beta.1";
const APP_BUILD   = "2024.07.08";
const APP_NAME    = "VetConnect";

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1024, w };
}

// ── Button feedback hook ──────────────────────────────────────────────────────
function useFeedback(ms=2000) {
  const [active, setActive] = useState(null);
  const trigger = (key) => { setActive(key); setTimeout(()=>setActive(null), ms); };
  return [active, trigger];
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function SkeletonCard({ C, lines=3 }) {
  return (
    <div style={{...card(C,{}),overflow:"hidden"}}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
      {[0.6,1,...Array(lines-2).fill(0.8)].map((w,i)=>(
        <div key={i} style={{height:14,borderRadius:7,marginBottom:10,width:`${w*100}%`,background:`linear-gradient(90deg,${C.border} 25%,${C.bg} 50%,${C.border} 75%)`,backgroundSize:"400px 100%",animation:"shimmer 1.2s ease-in-out infinite"}}/>
      ))}
      <div style={{height:32,borderRadius:8,width:"35%",background:`linear-gradient(90deg,${C.border} 25%,${C.bg} 50%,${C.border} 75%)`,backgroundSize:"400px 100%",animation:"shimmer 1.2s ease-in-out infinite",marginTop:6}}/>
    </div>
  );
}
function SkeletonFeed({ C }) {
  return <div>{[1,2,3].map(i=><SkeletonCard key={i} C={C} lines={4}/>)}</div>;
}
function usePersistentState(key, initial) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage?.get(key, false);
        if (!cancelled && res?.value !== undefined) {
          setValue(JSON.parse(res.value));
        }
      } catch (_) {
        // key doesn't exist yet — keep initial value
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  useEffect(() => {
    if (!loaded) return; // avoid overwriting saved data with the initial value before load completes
    window.storage?.set(key, JSON.stringify(value), false).catch(()=>{});
  }, [key, value, loaded]);

  return [value, setValue, loaded];
}

const DarkCtx = createContext({ dark: false, toggle: () => {} });
const LangCtx = createContext({ lang: "pt", t: k => k });
function useLang() { return useContext(LangCtx); }

const Icon = ({ d, size = 20, color = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const ic = {
  home:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  msg:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  video:"M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  shop:"M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  book:"M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  brief:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  brain:"M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M12 6v6l4 2",
  bell:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  search:"M11 17.25a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5z M16 16l4.5 4.5",
  heart:"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  send:"M22 2L11 13 M22 2L15 22 9 13 2 9 22 2z",
  phone:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  cog:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  more:"M5 12h.01 M12 12h.01 M19 12h.01",
  back:"M19 12H5 M12 5l-7 7 7 7",
  menu:"M3 12h18 M3 6h18 M3 18h18",
  x:"M18 6L6 18 M6 6l12 12",
  cam:"M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 0 2 2v10a2 2 0 0 0-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  map:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  calc:"M19 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z M7 7h10 M7 12h3 M7 17h3 M14 12h3 M14 17h3",
  check:"M20 6L9 17 4 12",
  sun:"M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42",
  moon:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  globe:"M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  mic:"M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8",
  share:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13",
  comment:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  plus:"M12 5v14 M5 12h14",
  lock:"M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  chart:"M18 20V10 M12 20V4 M6 20v-6",
};

const LIGHT = { teal:"#0D7377",tealL:"#14A085",tealD:"#095E62",mint:"#E8F6F4",mintD:"#C8EBE6",night:"#0F1923",ink:"#1C2B35",slate:"#3D5166",mist:"#8FA5B5",cloud:"#EEF3F7",white:"#FFFFFF",amber:"#E8A838",rose:"#E05C6A",emerald:"#27AE60",purple:"#6C3FC7",gold:"#D4AC0D",bg:"#EEF3F7",surface:"#FFFFFF",border:"#DEE9F0",text:"#1C2B35",sub:"#8FA5B5" };
const DARK  = { teal:"#19A99E",tealL:"#22C7BB",tealD:"#0D7377",mint:"#0D2E2C",mintD:"#133533",night:"#0A0F14",ink:"#E2EAF0",slate:"#A8BFCE",mist:"#607D8B",cloud:"#1A2430",white:"#1E2D3D",amber:"#F0B429",rose:"#F06B78",emerald:"#2ECC71",purple:"#8B5CF6",gold:"#F0C040",bg:"#111921",surface:"#1A2430",border:"#243040",text:"#E2EAF0",sub:"#607D8B" };

const LANGS = [
  {code:"pt",label:"Português",flag:"🇵🇹"},{code:"en",label:"English",flag:"🇬🇧"},
  {code:"es",label:"Español",flag:"🇪🇸"},{code:"fr",label:"Français",flag:"🇫🇷"},
  {code:"de",label:"Deutsch",flag:"🇩🇪"},{code:"it",label:"Italiano",flag:"🇮🇹"},
  {code:"zh",label:"中文",flag:"🇨🇳"},{code:"ja",label:"日本語",flag:"🇯🇵"},
  {code:"ar",label:"العربية",flag:"🇸🇦"},{code:"ru",label:"Русский",flag:"🇷🇺"},
  {code:"nl",label:"Nederlands",flag:"🇳🇱"},{code:"pl",label:"Polski",flag:"🇵🇱"},
];

const TR = {
  pt:{nav_home:"Início",nav_community:"Comunidade",nav_learn:"Aprender",nav_market:"Mercado",nav_clinic:"Clínica",nav_profile:"Perfil",appSub:"Rede Veterinária Global",search_placeholder:"Pesquisar colegas, casos, formações…",messages:"Mensagens",notifications:"Notificações",language:"Idioma",dark_mode:"Modo Escuro",online:"Online",offline:"Offline",typing:"a escrever…",send:"Enviar",attach_photo:"Foto",attach_file:"Ficheiro",open:"Abrir",select_conv:"Seleccione uma conversa",new_group:"Novo grupo",follow:"Seguir",publish:"Publicar",write_post:"Partilhe um caso, artigo ou novidade…",like:"Gostei",sponsored:"Patrocinado",live_now:"AO VIVO",watch:"Assistir",register:"Inscrever",suppliers:"Fornecedores",order:"Encomendar",contact:"Contactar",apply:"Candidatar",save:"Guardar",urgent:"Urgente",generate_ai:"Gerar Diagnóstico com IA",analyzing:"A analisar…",species:"Espécie",age:"Idade",sex:"Sexo",breed:"Raça",symptoms:"Sinais Clínicos",other_symptoms:"Outros Sinais",anamnesis:"Anamnese",results:"Resultados",urgency:"Urgência",summary:"Resumo Clínico",lab_interp:"Interpretação Laboratorial",differentials:"Diagnósticos Diferenciais",next_steps:"Próximos Passos",disclaimer:"Diagnóstico assistido por IA — não substitui o exame clínico.",calculator:"Calculadora Clínica",drug_db:"Base de Dados Fármacos",protocols:"Protocolos Clínicos",expert_map:"Mapa de Especialistas",cases:"Casos SOAP",jobs:"Emprego",marketplace:"Marketplace",training:"Formação",settings:"Definições",onb_welcome:"Bem-vindo à VetConnect",onb_sub:"A rede profissional global para médicos veterinários",onb_start:"Começar",onb_spec:"Qual a sua especialidade?",onb_country:"País de exercício",onb_license:"Número de cédula / licença",onb_interests:"Seleccione as suas áreas de interesse",onb_suggestions:"Colegas sugeridos para seguir",onb_finish:"Entrar na VetConnect",mark_all:"Marcar tudo lido",notif_settings:"Preferências de notificação",search_empty:"Sem resultados para",results_vets:"Colegas",results_cases:"Casos clínicos",results_training:"Formações",results_market:"Marketplace",login_title:"Entrar na sua conta",login_email:"Email profissional",login_password:"Password",login_forgot:"Esqueceu a password?",login_enter:"Entrar",login_creating:"A verificar…",login_social:"ou",login_no_account:"Ainda não tem conta?",login_create:"Criar conta gratuita",login_demo:"Demo",login_sent:"Email enviado!",login_sent_sub:"Verifique a sua caixa de entrada para redefinir a password.",login_back:"Voltar ao login",feed_title:"Feed de Publicações",new_post:"Nova publicação",load_more:"Carregar mais publicações",remaining:"restantes",community_messages:"Mensagens",community_groups:"Grupos de Discussão",community_meetings:"Reuniões & Videochamadas",community_calendar:"Calendário Unificado",new_meeting:"Nova Reunião",new_group_title:"Novo Grupo",group_name:"Nome do grupo",add_members:"Adicionar membros",invite_members:"Convidar participantes",meeting_title:"Título da reunião",search_colleagues:"Pesquisar colegas…",selected_members:"membro selecionado",selected_members_pl:"membros selecionados",invited:"participante convidado",invited_pl:"participantes convidados",create_group:"Criar Grupo",schedule:"Agendar",video_call:"Nova Videochamada",instant_room:"Sala instantânea — partilhe o link com colegas",room_created:"Sala de videochamada criada",copy_link:"Copiar link",copied:"✓ Copiado!",learn_live:"Live & Congressos",learn_courses:"Cursos & Certificações",learn_promo:"Divulgação",live_now_section:"Ao Vivo Agora",upcoming:"Próximos Eventos",broadcast:"Transmissão",start_broadcast:"Iniciar Transmissão",broadcasting:"🔴 A transmitir…",schedule_broadcast:"Agendar",scheduled:"✓ Agendado!",published:"✓ Publicado!",enroll:"Inscrever",enrolled:"✓ Inscrito",search_events:"Pesquisar congressos, palestras, temas…",search_courses:"Pesquisar cursos, autores, temas…",no_results:"Sem resultados",clear_filters:"Limpar filtros",market_title:"Marketplace Veterinário",create_ad:"Criar Anúncio",ad_title:"Título do anúncio",ad_category:"Categoria",ad_price:"Preço",ad_condition:"Condição",ad_location:"Localização",ad_emoji:"Emoji / Ícone",ad_desc:"Descrição",ad_preview:"Pré-visualização",publish_ad:"Publicar Anúncio",jobs_title:"Emprego Veterinário",publish_cv:"Publicar CV",new_job:"+ Vaga",job_title_field:"Título da vaga",job_company:"Empresa / Clínica",job_type:"Tipo de contrato",job_location:"Localização",job_salary:"Salário / Remuneração",job_desc:"Descrição da vaga",publish_job:"Publicar Vaga",daily_report:"Relatório Diário",suppliers_title:"Catálogos de Fornecedores",become_supplier:"Ser Fornecedor",search_suppliers:"Pesquisar produtos ou fornecedores…",back_catalogue:"Voltar ao catálogo",products_tab:"Produtos",video_dim:"Vídeo DIM",catalogue_tab:"Catálogo/Preçário",clinic_ai:"Diagnóstico Diferencial por IA",clinic_calc:"Calculadora Clínica",clinic_drugs:"Fármacos",clinic_protocols:"Protocolos Clínicos",clinic_cases:"Casos SOAP",clinic_map:"Mapa de Especialistas",history:"Histórico",ai_history_title:"Histórico de Diagnósticos",saved_cases:"caso guardado",saved_cases_pl:"casos guardados",compare:"Seleccione 2 para comparar",clear_selection:"Limpar selecção",generate:"Gerar Diagnóstico",generating:"A gerar…",no_history:"Ainda não gerou nenhum diagnóstico.",try_again:"Tentar novamente",profile_posts:"Publicações",profile_cases:"Casos",profile_certs:"Certificações",profile_stats:"Estatísticas",edit_profile:"Editar Perfil",save_changes:"Guardar alterações",name:"Nome",specialty:"Especialidade",bio:"Biografia",saved_ok:"✓ Guardado!",settings_account:"Conta",settings_appearance:"Aparência",settings_notifications:"Notificações",settings_privacy:"Privacidade",send_feedback:"Enviar Feedback Beta",cancel:"Cancelar",close:"Fechar",delete:"Eliminar",back:"Voltar",confirm:"Confirmar",edit:"Editar",share:"Partilhar",download:"Descarregar",upload:"Carregar",preview:"Pré-visualização",no_results_found:"Sem resultados",loading:"A carregar…",error:"Erro",retry:"Tentar novamente"},
  en:{nav_home:"Home",nav_community:"Community",nav_learn:"Learn",nav_market:"Market",nav_clinic:"Clinic",nav_profile:"Profile",appSub:"Global Veterinary Network",search_placeholder:"Search colleagues, cases, training…",messages:"Messages",notifications:"Notifications",language:"Language",dark_mode:"Dark Mode",online:"Online",offline:"Offline",typing:"typing…",send:"Send",attach_photo:"Photo",attach_file:"File",open:"Open",select_conv:"Select a conversation",new_group:"New group",follow:"Follow",publish:"Post",write_post:"Share a case, article or update…",like:"Like",sponsored:"Sponsored",live_now:"LIVE",watch:"Watch",register:"Register",suppliers:"Suppliers",order:"Order",contact:"Contact",apply:"Apply",save:"Save",urgent:"Urgent",generate_ai:"Generate AI Diagnosis",analyzing:"Analyzing…",species:"Species",age:"Age",sex:"Sex",breed:"Breed",symptoms:"Clinical Signs",other_symptoms:"Other Signs",anamnesis:"Anamnesis",results:"Results",urgency:"Urgency",summary:"Clinical Summary",lab_interp:"Laboratory Interpretation",differentials:"Differential Diagnoses",next_steps:"Next Steps",disclaimer:"AI-assisted diagnosis — does not replace clinical examination.",calculator:"Clinical Calculator",drug_db:"Drug Database",protocols:"Clinical Protocols",expert_map:"Expert Map",cases:"SOAP Cases",jobs:"Jobs",marketplace:"Marketplace",training:"Training",settings:"Settings",onb_welcome:"Welcome to VetConnect",onb_sub:"The global professional network for veterinarians",onb_start:"Get Started",onb_spec:"What is your specialty?",onb_country:"Country of practice",onb_license:"License / registration number",onb_interests:"Select your areas of interest",onb_suggestions:"Suggested colleagues to follow",onb_finish:"Enter VetConnect",mark_all:"Mark all read",notif_settings:"Notification settings",search_empty:"No results for",results_vets:"Colleagues",results_cases:"Clinical cases",results_training:"Training",results_market:"Marketplace"},
  es:{nav_home:"Inicio",nav_community:"Comunidad",nav_learn:"Aprender",nav_market:"Mercado",nav_clinic:"Clínica",nav_profile:"Perfil",appSub:"Red Veterinaria Global",search_placeholder:"Buscar colegas, casos, formación…",messages:"Mensajes",notifications:"Notificaciones",language:"Idioma",dark_mode:"Modo Oscuro",online:"En línea",offline:"Desconectado",typing:"escribiendo…",send:"Enviar",attach_photo:"Foto",attach_file:"Archivo",open:"Abrir",select_conv:"Seleccione una conversación",new_group:"Nuevo grupo",follow:"Seguir",publish:"Publicar",write_post:"Comparte un caso, artículo o novedad…",like:"Me gusta",sponsored:"Patrocinado",live_now:"EN DIRECTO",watch:"Ver",register:"Inscribirse",suppliers:"Proveedores",order:"Pedir",contact:"Contactar",apply:"Postular",save:"Guardar",urgent:"Urgente",generate_ai:"Generar Diagnóstico IA",analyzing:"Analizando…",species:"Especie",age:"Edad",sex:"Sexo",breed:"Raza",symptoms:"Signos Clínicos",other_symptoms:"Otros Signos",anamnesis:"Anamnesis",results:"Resultados",urgency:"Urgencia",summary:"Resumen Clínico",lab_interp:"Interpretación Laboratorial",differentials:"Diagnósticos Diferenciales",next_steps:"Próximos Pasos",disclaimer:"Diagnóstico asistido por IA — no reemplaza el examen clínico.",calculator:"Calculadora Clínica",drug_db:"Base de Datos Fármacos",protocols:"Protocolos Clínicos",expert_map:"Mapa de Especialistas",cases:"Casos SOAP",jobs:"Empleo",marketplace:"Mercado",training:"Formación",settings:"Ajustes",onb_welcome:"Bienvenido a VetConnect",onb_sub:"La red profesional global para veterinarios",onb_start:"Comenzar",onb_spec:"¿Cuál es su especialidad?",onb_country:"País de ejercicio",onb_license:"Número de licencia",onb_interests:"Seleccione sus áreas de interés",onb_suggestions:"Colegas sugeridos para seguir",onb_finish:"Entrar a VetConnect",mark_all:"Marcar todo leído",notif_settings:"Preferencias de notificación",search_empty:"Sin resultados para",results_vets:"Colegas",results_cases:"Casos clínicos",results_training:"Formación",results_market:"Mercado"},login_title:"Iniciar sesión",login_email:"Email profesional",login_password:"Contraseña",login_forgot:"¿Olvidó su contraseña?",login_enter:"Entrar",login_creating:"Verificando…",login_social:"o",login_no_account:"¿No tiene cuenta?",login_create:"Crear cuenta gratuita",login_demo:"Demo",login_sent:"¡Email enviado!",login_sent_sub:"Revise su bandeja de entrada.",login_back:"Volver al inicio",feed_title:"Feed de publicaciones",new_post:"Nueva publicación",load_more:"Cargar más publicaciones",remaining:"restantes",community_messages:"Mensajes",community_groups:"Grupos de Discusión",community_meetings:"Reuniones y Videollamadas",community_calendar:"Calendario Unificado",new_meeting:"Nueva Reunión",new_group_title:"Nuevo Grupo",group_name:"Nombre del grupo",add_members:"Añadir miembros",invite_members:"Invitar participantes",meeting_title:"Título de la reunión",search_colleagues:"Buscar colegas…",selected_members:"miembro seleccionado",selected_members_pl:"miembros seleccionados",invited:"participante invitado",invited_pl:"participantes invitados",create_group:"Crear Grupo",schedule:"Programar",video_call:"Nueva Videollamada",instant_room:"Sala instantánea — comparta el enlace",room_created:"Sala de videollamada creada",copy_link:"Copiar enlace",copied:"✓ Copiado!",learn_live:"Live & Congresos",learn_courses:"Cursos & Certificaciones",learn_promo:"Divulgación",live_now_section:"En Vivo Ahora",upcoming:"Próximos Eventos",broadcast:"Transmisión",start_broadcast:"Iniciar Transmisión",broadcasting:"🔴 Transmitiendo…",schedule_broadcast:"Programar",scheduled:"✓ Programado!",published:"✓ Publicado!",enroll:"Inscribirse",enrolled:"✓ Inscrito",search_events:"Buscar congresos, ponencias…",search_courses:"Buscar cursos, autores…",no_results:"Sin resultados",clear_filters:"Borrar filtros",market_title:"Mercado Veterinario",create_ad:"Crear Anuncio",ad_title:"Título del anuncio",ad_category:"Categoría",ad_price:"Precio",ad_condition:"Condición",ad_location:"Ubicación",ad_emoji:"Emoji / Ícono",ad_desc:"Descripción",ad_preview:"Vista previa",publish_ad:"Publicar Anuncio",jobs_title:"Empleo Veterinario",publish_cv:"Publicar CV",new_job:"+ Vacante",job_title_field:"Título del puesto",job_company:"Empresa / Clínica",job_type:"Tipo de contrato",job_location:"Ubicación",job_salary:"Salario",job_desc:"Descripción del puesto",publish_job:"Publicar Vacante",daily_report:"Informe Diario",suppliers_title:"Catálogos de Proveedores",become_supplier:"+ Ser Proveedor",search_suppliers:"Buscar productos o proveedores…",back_catalogue:"Volver al catálogo",products_tab:"Productos",video_dim:"Vídeo DIM",catalogue_tab:"Catálogo/Precios",clinic_ai:"Diagnóstico Diferencial IA",clinic_calc:"Calculadora Clínica",clinic_drugs:"Fármacos",clinic_protocols:"Protocolos",clinic_cases:"Casos SOAP",clinic_map:"Mapa de Especialistas",history:"Historial",ai_history_title:"Historial de Diagnósticos",saved_cases:"caso guardado",saved_cases_pl:"casos guardados",compare:"Seleccione 2 para comparar",clear_selection:"Borrar selección",generate:"Generar Diagnóstico",generating:"Generando…",no_history:"Aún no ha generado diagnósticos.",try_again:"Intentar de nuevo",profile_posts:"Publicaciones",profile_cases:"Casos",profile_certs:"Certificaciones",profile_stats:"Estadísticas",edit_profile:"Editar Perfil",save_changes:"Guardar cambios",name:"Nombre",specialty:"Especialidad",bio:"Biografía",saved_ok:"✓ Guardado!",settings_account:"Cuenta",settings_appearance:"Apariencia",settings_notifications:"Notificaciones",settings_privacy:"Privacidad",send_feedback:"Enviar Comentarios Beta",cancel:"Cancelar",close:"Cerrar",delete:"Eliminar",back:"Volver",confirm:"Confirmar",edit:"Editar",share:"Compartir",download:"Descargar",upload:"Subir",preview:"Vista previa",no_results_found:"Sin resultados",loading:"Cargando…",error:"Error",retry:"Intentar de nuevo",
  fr:{nav_home:"Accueil",nav_community:"Communauté",nav_learn:"Apprendre",nav_market:"Marché",nav_clinic:"Clinique",nav_profile:"Profil",appSub:"Réseau Vétérinaire Mondial",search_placeholder:"Rechercher collègues, cas, formations…",messages:"Messages",notifications:"Notifications",language:"Langue",dark_mode:"Mode Sombre",online:"En ligne",offline:"Hors ligne",typing:"écrit…",send:"Envoyer",attach_photo:"Photo",attach_file:"Fichier",open:"Ouvrir",select_conv:"Sélectionnez une conversation",new_group:"Nouveau groupe",follow:"Suivre",publish:"Publier",write_post:"Partagez un cas, article ou actualité…",like:"J'aime",sponsored:"Sponsorisé",live_now:"EN DIRECT",watch:"Regarder",register:"S'inscrire",suppliers:"Fournisseurs",order:"Commander",contact:"Contacter",apply:"Postuler",save:"Sauvegarder",urgent:"Urgent",generate_ai:"Générer Diagnostic IA",analyzing:"Analyse en cours…",species:"Espèce",age:"Âge",sex:"Sexe",breed:"Race",symptoms:"Signes Cliniques",other_symptoms:"Autres Signes",anamnesis:"Anamnèse",results:"Résultats",urgency:"Urgence",summary:"Résumé Clinique",lab_interp:"Interprétation Laboratoire",differentials:"Diagnostics Différentiels",next_steps:"Prochaines Étapes",disclaimer:"Diagnostic assisté par IA — ne remplace pas l'examen clinique.",calculator:"Calculateur Clinique",drug_db:"Base de Données Médicaments",protocols:"Protocoles Cliniques",expert_map:"Carte des Spécialistes",cases:"Cas SOAP",jobs:"Emploi",marketplace:"Marché",training:"Formation",settings:"Paramètres",onb_welcome:"Bienvenue sur VetConnect",onb_sub:"Le réseau professionnel mondial pour les vétérinaires",onb_start:"Commencer",onb_spec:"Quelle est votre spécialité?",onb_country:"Pays d'exercice",onb_license:"Numéro de licence",onb_interests:"Sélectionnez vos domaines d'intérêt",onb_suggestions:"Collègues suggérés",onb_finish:"Entrer dans VetConnect",mark_all:"Tout marquer lu",notif_settings:"Préférences de notification",search_empty:"Aucun résultat pour",results_vets:"Collègues",results_cases:"Cas cliniques",results_training:"Formation",results_market:"Marché"},login_title:"Connexion à votre compte",login_email:"Email professionnel",login_password:"Mot de passe",login_forgot:"Mot de passe oublié?",login_enter:"Se connecter",login_creating:"Vérification…",login_social:"ou",login_no_account:"Pas encore de compte?",login_create:"Créer un compte gratuit",login_demo:"Démo",login_sent:"Email envoyé!",login_sent_sub:"Vérifiez votre boîte de réception.",login_back:"Retour à la connexion",feed_title:"Fil d'actualité",new_post:"Nouvelle publication",load_more:"Charger plus",remaining:"restants",community_messages:"Messages",community_groups:"Groupes de Discussion",community_meetings:"Réunions & Appels Vidéo",community_calendar:"Calendrier Unifié",new_meeting:"Nouvelle Réunion",new_group_title:"Nouveau Groupe",group_name:"Nom du groupe",add_members:"Ajouter des membres",invite_members:"Inviter des participants",meeting_title:"Titre de la réunion",search_colleagues:"Rechercher des collègues…",selected_members:"membre sélectionné",selected_members_pl:"membres sélectionnés",invited:"participant invité",invited_pl:"participants invités",create_group:"Créer le Groupe",schedule:"Planifier",video_call:"Nouvel Appel Vidéo",instant_room:"Salle instantanée — partagez le lien",room_created:"Salle vidéo créée",copy_link:"Copier le lien",copied:"✓ Copié!",learn_live:"Live & Congrès",learn_courses:"Cours & Certifications",learn_promo:"Promotion",live_now_section:"En Direct Maintenant",upcoming:"Événements à venir",broadcast:"Diffusion",start_broadcast:"Démarrer la diffusion",broadcasting:"🔴 En cours…",schedule_broadcast:"Planifier",scheduled:"✓ Planifié!",published:"✓ Publié!",enroll:"S'inscrire",enrolled:"✓ Inscrit",search_events:"Rechercher congrès, conférences…",search_courses:"Rechercher cours, auteurs…",no_results:"Aucun résultat",clear_filters:"Effacer les filtres",market_title:"Marché Vétérinaire",create_ad:"Créer une Annonce",ad_title:"Titre de l'annonce",ad_category:"Catégorie",ad_price:"Prix",ad_condition:"État",ad_location:"Localisation",ad_emoji:"Emoji / Icône",ad_desc:"Description",ad_preview:"Aperçu",publish_ad:"Publier l'Annonce",jobs_title:"Emploi Vétérinaire",publish_cv:"Publier CV",new_job:"+ Offre",job_title_field:"Intitulé du poste",job_company:"Entreprise / Clinique",job_type:"Type de contrat",job_location:"Localisation",job_salary:"Salaire",job_desc:"Description du poste",publish_job:"Publier l'Offre",daily_report:"Rapport Quotidien",suppliers_title:"Catalogues Fournisseurs",become_supplier:"+ Devenir Fournisseur",search_suppliers:"Rechercher produits ou fournisseurs…",back_catalogue:"Retour au catalogue",products_tab:"Produits",video_dim:"Vidéo DIM",catalogue_tab:"Catalogue/Tarifs",clinic_ai:"Diagnostic Différentiel IA",clinic_calc:"Calculateur Clinique",clinic_drugs:"Médicaments",clinic_protocols:"Protocoles",clinic_cases:"Cas SOAP",clinic_map:"Carte des Spécialistes",history:"Historique",ai_history_title:"Historique des Diagnostics",saved_cases:"cas enregistré",saved_cases_pl:"cas enregistrés",compare:"Sélectionnez 2 pour comparer",clear_selection:"Effacer la sélection",generate:"Générer le Diagnostic",generating:"Génération…",no_history:"Aucun diagnostic généré.",try_again:"Réessayer",profile_posts:"Publications",profile_cases:"Cas",profile_certs:"Certifications",profile_stats:"Statistiques",edit_profile:"Modifier le Profil",save_changes:"Enregistrer",name:"Nom",specialty:"Spécialité",bio:"Biographie",saved_ok:"✓ Enregistré!",settings_account:"Compte",settings_appearance:"Apparence",settings_notifications:"Notifications",settings_privacy:"Confidentialité",send_feedback:"Envoyer des Commentaires",cancel:"Annuler",close:"Fermer",delete:"Supprimer",back:"Retour",confirm:"Confirmer",edit:"Modifier",share:"Partager",download:"Télécharger",upload:"Téléverser",preview:"Aperçu",no_results_found:"Aucun résultat",loading:"Chargement…",error:"Erreur",retry:"Réessayer",
  de:{nav_home:"Startseite",nav_community:"Gemeinschaft",nav_learn:"Lernen",nav_market:"Markt",nav_clinic:"Klinik",nav_profile:"Profil",appSub:"Globales Tierärzte-Netzwerk",search_placeholder:"Kollegen, Fälle, Fortbildungen suchen…",messages:"Nachrichten",notifications:"Benachrichtigungen",language:"Sprache",dark_mode:"Dunkelmodus",online:"Online",offline:"Offline",typing:"schreibt…",send:"Senden",attach_photo:"Foto",attach_file:"Datei",open:"Öffnen",select_conv:"Gespräch auswählen",new_group:"Neue Gruppe",follow:"Folgen",publish:"Veröffentlichen",write_post:"Fall, Artikel oder Neuigkeit teilen…",like:"Gefällt mir",sponsored:"Gesponsert",live_now:"LIVE",watch:"Ansehen",register:"Anmelden",suppliers:"Lieferanten",order:"Bestellen",contact:"Kontakt",apply:"Bewerben",save:"Speichern",urgent:"Dringend",generate_ai:"KI-Diagnose erstellen",analyzing:"Analysiere…",species:"Spezies",age:"Alter",sex:"Geschlecht",breed:"Rasse",symptoms:"Klinische Zeichen",other_symptoms:"Weitere Zeichen",anamnesis:"Anamnese",results:"Ergebnisse",urgency:"Dringlichkeit",summary:"Klinische Zusammenfassung",lab_interp:"Laborinterpretation",differentials:"Differentialdiagnosen",next_steps:"Nächste Schritte",disclaimer:"KI-gestützte Diagnose — ersetzt nicht die klinische Untersuchung.",calculator:"Klinischer Rechner",drug_db:"Medikamentendatenbank",protocols:"Klinische Protokolle",expert_map:"Spezialistenkarte",cases:"SOAP-Fälle",jobs:"Stellenangebote",marketplace:"Marktplatz",training:"Fortbildung",settings:"Einstellungen",onb_welcome:"Willkommen bei VetConnect",onb_sub:"Das globale Berufsnetzwerk für Tierärzte",onb_start:"Loslegen",onb_spec:"Was ist Ihre Fachrichtung?",onb_country:"Tätigkeitsland",onb_license:"Lizenznummer",onb_interests:"Wählen Sie Ihre Interessengebiete",onb_suggestions:"Vorgeschlagene Kollegen",onb_finish:"VetConnect betreten",mark_all:"Alle als gelesen markieren",notif_settings:"Benachrichtigungseinstellungen",search_empty:"Keine Ergebnisse für",results_vets:"Kollegen",results_cases:"Klinische Fälle",results_training:"Fortbildung",results_market:"Markt"},login_title:"Inloggen op uw account",login_email:"Professioneel e-mailadres",login_password:"Wachtwoord",login_forgot:"Wachtwoord vergeten?",login_enter:"Inloggen",login_creating:"Verificatie…",login_social:"of",login_no_account:"Nog geen account?",login_create:"Gratis account aanmaken",login_demo:"Demo",login_sent:"E-mail verzonden!",login_sent_sub:"Controleer uw inbox.",login_back:"Terug naar inloggen",feed_title:"Berichtenstream",new_post:"Nieuw bericht",load_more:"Meer laden",remaining:"resterend",community_messages:"Berichten",community_groups:"Discussiegroepen",community_meetings:"Vergaderingen & Videogesprekken",community_calendar:"Gecombineerde Agenda",new_meeting:"Nieuwe Vergadering",new_group_title:"Nieuwe Groep",group_name:"Groepsnaam",add_members:"Leden toevoegen",invite_members:"Deelnemers uitnodigen",meeting_title:"Vergadertitel",search_colleagues:"Collega's zoeken…",selected_members:"lid geselecteerd",selected_members_pl:"leden geselecteerd",invited:"deelnemer uitgenodigd",invited_pl:"deelnemers uitgenodigd",create_group:"Groep aanmaken",schedule:"Plannen",video_call:"Nieuw Videogesprek",instant_room:"Onmiddellijke kamer — deel de link",room_created:"Videokamer aangemaakt",copy_link:"Link kopiëren",copied:"✓ Gekopieerd!",learn_live:"Live & Congressen",learn_courses:"Cursussen & Certificeringen",learn_promo:"Promotie",live_now_section:"Nu Live",upcoming:"Aankomende Evenementen",broadcast:"Uitzending",start_broadcast:"Uitzending starten",broadcasting:"🔴 Uitzending…",schedule_broadcast:"Plannen",scheduled:"✓ Gepland!",published:"✓ Gepubliceerd!",enroll:"Inschrijven",enrolled:"✓ Ingeschreven",search_events:"Congressen zoeken…",search_courses:"Cursussen zoeken…",no_results:"Geen resultaten",clear_filters:"Filters wissen",market_title:"Veterinaire Marktplaats",create_ad:"Advertentie aanmaken",ad_title:"Advertentietitel",ad_category:"Categorie",ad_price:"Prijs",ad_condition:"Staat",ad_location:"Locatie",ad_emoji:"Emoji / Pictogram",ad_desc:"Beschrijving",ad_preview:"Voorbeeld",publish_ad:"Advertentie plaatsen",jobs_title:"Veterinaire Vacatures",publish_cv:"CV publiceren",new_job:"+ Vacature",job_title_field:"Functietitel",job_company:"Bedrijf / Kliniek",job_type:"Contracttype",job_location:"Locatie",job_salary:"Salaris",job_desc:"Functiebeschrijving",publish_job:"Vacature plaatsen",daily_report:"Dagelijks Rapport",suppliers_title:"Leverancierscatalogi",become_supplier:"+ Leverancier worden",search_suppliers:"Producten of leveranciers zoeken…",back_catalogue:"Terug naar catalogus",products_tab:"Producten",video_dim:"DIM-video",catalogue_tab:"Catalogus/Prijslijst",clinic_ai:"AI Differentiaaldiagnose",clinic_calc:"Klinische Calculator",clinic_drugs:"Geneesmiddelen",clinic_protocols:"Protocollen",clinic_cases:"SOAP Gevallen",clinic_map:"Specialistenkaart",history:"Geschiedenis",ai_history_title:"Diagnosegeschiedenis",saved_cases:"geval opgeslagen",saved_cases_pl:"gevallen opgeslagen",compare:"Selecteer 2 om te vergelijken",clear_selection:"Selectie wissen",generate:"Diagnose genereren",generating:"Genereren…",no_history:"Nog geen diagnoses.",try_again:"Opnieuw proberen",profile_posts:"Berichten",profile_cases:"Gevallen",profile_certs:"Certificeringen",profile_stats:"Statistieken",edit_profile:"Profiel bewerken",save_changes:"Wijzigingen opslaan",name:"Naam",specialty:"Specialiteit",bio:"Biografie",saved_ok:"✓ Opgeslagen!",settings_account:"Account",settings_appearance:"Weergave",settings_notifications:"Meldingen",settings_privacy:"Privacy",send_feedback:"Bèta-feedback verzenden",cancel:"Annuleren",close:"Sluiten",delete:"Verwijderen",back:"Terug",confirm:"Bevestigen",edit:"Bewerken",share:"Delen",download:"Downloaden",upload:"Uploaden",preview:"Voorbeeld",no_results_found:"Geen resultaten",loading:"Laden…",error:"Fout",retry:"Opnieuw proberen",login_title:"Bei Ihrem Konto anmelden",login_email:"Professionelle E-Mail",login_password:"Passwort",login_forgot:"Passwort vergessen?",login_enter:"Anmelden",login_creating:"Überprüfung…",login_social:"oder",login_no_account:"Noch kein Konto?",login_create:"Kostenloses Konto erstellen",login_demo:"Demo",login_sent:"E-Mail gesendet!",login_sent_sub:"Überprüfen Sie Ihren Posteingang.",login_back:"Zurück zur Anmeldung",feed_title:"Neuigkeiten",new_post:"Neuer Beitrag",load_more:"Mehr laden",remaining:"verbleibend",community_messages:"Nachrichten",community_groups:"Diskussionsgruppen",community_meetings:"Besprechungen & Videoanrufe",community_calendar:"Einheitlicher Kalender",new_meeting:"Neue Besprechung",new_group_title:"Neue Gruppe",group_name:"Gruppenname",add_members:"Mitglieder hinzufügen",invite_members:"Teilnehmer einladen",meeting_title:"Besprechungstitel",search_colleagues:"Kollegen suchen…",selected_members:"Mitglied ausgewählt",selected_members_pl:"Mitglieder ausgewählt",invited:"Teilnehmer eingeladen",invited_pl:"Teilnehmer eingeladen",create_group:"Gruppe erstellen",schedule:"Planen",video_call:"Neuer Videoanruf",instant_room:"Sofortiger Raum — Link teilen",room_created:"Videoraum erstellt",copy_link:"Link kopieren",copied:"✓ Kopiert!",learn_live:"Live & Kongresse",learn_courses:"Kurse & Zertifizierungen",learn_promo:"Werbung",live_now_section:"Jetzt Live",upcoming:"Kommende Veranstaltungen",broadcast:"Übertragung",start_broadcast:"Übertragung starten",broadcasting:"🔴 Überträgt…",schedule_broadcast:"Planen",scheduled:"✓ Geplant!",published:"✓ Veröffentlicht!",enroll:"Anmelden",enrolled:"✓ Angemeldet",search_events:"Kongresse suchen…",search_courses:"Kurse suchen…",no_results:"Keine Ergebnisse",clear_filters:"Filter löschen",market_title:"Veterinärmarktplatz",create_ad:"Anzeige erstellen",ad_title:"Anzeigentitel",ad_category:"Kategorie",ad_price:"Preis",ad_condition:"Zustand",ad_location:"Standort",ad_emoji:"Emoji / Symbol",ad_desc:"Beschreibung",ad_preview:"Vorschau",publish_ad:"Anzeige veröffentlichen",jobs_title:"Tierärztliche Stellenangebote",publish_cv:"Lebenslauf veröffentlichen",new_job:"+ Stelle",job_title_field:"Stellenbezeichnung",job_company:"Unternehmen / Klinik",job_type:"Vertragsart",job_location:"Standort",job_salary:"Gehalt",job_desc:"Stellenbeschreibung",publish_job:"Stelle veröffentlichen",daily_report:"Tagesbericht",suppliers_title:"Lieferantenkataloge",become_supplier:"+ Lieferant werden",search_suppliers:"Produkte oder Lieferanten suchen…",back_catalogue:"Zurück zum Katalog",products_tab:"Produkte",video_dim:"DIM-Video",catalogue_tab:"Katalog/Preisliste",clinic_ai:"KI-Differentialdiagnose",clinic_calc:"Klinischer Rechner",clinic_drugs:"Medikamente",clinic_protocols:"Protokolle",clinic_cases:"SOAP-Fälle",clinic_map:"Spezialistenkarte",history:"Verlauf",ai_history_title:"Diagnoseverlauf",saved_cases:"Fall gespeichert",saved_cases_pl:"Fälle gespeichert",compare:"2 zum Vergleichen auswählen",clear_selection:"Auswahl löschen",generate:"Diagnose erstellen",generating:"Erstelle…",no_history:"Noch keine Diagnosen.",try_again:"Erneut versuchen",profile_posts:"Beiträge",profile_cases:"Fälle",profile_certs:"Zertifizierungen",profile_stats:"Statistiken",edit_profile:"Profil bearbeiten",save_changes:"Änderungen speichern",name:"Name",specialty:"Fachgebiet",bio:"Biografie",saved_ok:"✓ Gespeichert!",settings_account:"Konto",settings_appearance:"Erscheinungsbild",settings_notifications:"Benachrichtigungen",settings_privacy:"Datenschutz",send_feedback:"Beta-Feedback senden",cancel:"Abbrechen",close:"Schließen",delete:"Löschen",back:"Zurück",confirm:"Bestätigen",edit:"Bearbeiten",share:"Teilen",download:"Herunterladen",upload:"Hochladen",preview:"Vorschau",no_results_found:"Keine Ergebnisse",loading:"Laden…",error:"Fehler",retry:"Erneut versuchen",
  it:{nav_home:"Home",nav_community:"Comunità",nav_learn:"Formazione",nav_market:"Mercato",nav_clinic:"Clinica",nav_profile:"Profilo",appSub:"Rete Veterinaria Globale",search_placeholder:"Cerca colleghi, casi, formazione…",messages:"Messaggi",notifications:"Notifiche",language:"Lingua",dark_mode:"Modalità Scura",online:"Online",offline:"Offline",typing:"sta scrivendo…",send:"Invia",attach_photo:"Foto",attach_file:"File",open:"Apri",select_conv:"Seleziona conversazione",new_group:"Nuovo gruppo",follow:"Segui",publish:"Pubblica",write_post:"Condividi un caso, articolo o novità…",like:"Mi piace",sponsored:"Sponsorizzato",live_now:"IN DIRETTA",watch:"Guarda",register:"Iscriviti",suppliers:"Fornitori",order:"Ordina",contact:"Contatta",apply:"Candidati",save:"Salva",urgent:"Urgente",generate_ai:"Genera Diagnosi IA",analyzing:"Analisi in corso…",species:"Specie",age:"Età",sex:"Sesso",breed:"Razza",symptoms:"Segni Clinici",other_symptoms:"Altri Segni",anamnesis:"Anamnesi",results:"Risultati",urgency:"Urgenza",summary:"Sommario Clinico",lab_interp:"Interpretazione Laboratorio",differentials:"Diagnosi Differenziali",next_steps:"Passi Successivi",disclaimer:"Diagnosi assistita da IA — non sostituisce l'esame clinico.",calculator:"Calcolatore Clinico",drug_db:"Database Farmaci",protocols:"Protocolli Clinici",expert_map:"Mappa Specialisti",cases:"Casi SOAP",jobs:"Lavoro",marketplace:"Mercato",training:"Formazione",settings:"Impostazioni",onb_welcome:"Benvenuto su VetConnect",onb_sub:"La rete professionale globale per veterinari",onb_start:"Inizia",onb_spec:"Qual è la tua specialità?",onb_country:"Paese di esercizio",onb_license:"Numero di licenza",onb_interests:"Seleziona le aree di interesse",onb_suggestions:"Colleghi suggeriti",onb_finish:"Entra in VetConnect",mark_all:"Segna tutto come letto",notif_settings:"Preferenze notifiche",search_empty:"Nessun risultato per",results_vets:"Colleghi",results_cases:"Casi clinici",results_training:"Formazione",results_market:"Mercato"},login_title:"Accedi al tuo account",login_email:"Email professionale",login_password:"Password",login_forgot:"Password dimenticata?",login_enter:"Accedi",login_creating:"Verifica in corso…",login_social:"o",login_no_account:"Non hai un account?",login_create:"Crea account gratuito",login_demo:"Demo",login_sent:"Email inviata!",login_sent_sub:"Controlla la posta in arrivo.",login_back:"Torna al login",feed_title:"Feed delle pubblicazioni",new_post:"Nuova pubblicazione",load_more:"Carica altro",remaining:"rimanenti",community_messages:"Messaggi",community_groups:"Gruppi di Discussione",community_meetings:"Riunioni & Videochiamate",community_calendar:"Calendario Unificato",new_meeting:"Nuova Riunione",new_group_title:"Nuovo Gruppo",group_name:"Nome del gruppo",add_members:"Aggiungi membri",invite_members:"Invita partecipanti",meeting_title:"Titolo della riunione",search_colleagues:"Cerca colleghi…",selected_members:"membro selezionato",selected_members_pl:"membri selezionati",invited:"partecipante invitato",invited_pl:"partecipanti invitati",create_group:"Crea Gruppo",schedule:"Pianifica",video_call:"Nuova Videochiamata",instant_room:"Sala istantanea — condividi il link",room_created:"Sala video creata",copy_link:"Copia link",copied:"✓ Copiato!",learn_live:"Live & Congressi",learn_courses:"Corsi & Certificazioni",learn_promo:"Promozione",live_now_section:"In Diretta Ora",upcoming:"Prossimi Eventi",broadcast:"Trasmissione",start_broadcast:"Inizia trasmissione",broadcasting:"🔴 In trasmissione…",schedule_broadcast:"Pianifica",scheduled:"✓ Pianificato!",published:"✓ Pubblicato!",enroll:"Iscriviti",enrolled:"✓ Iscritto",search_events:"Cerca congressi, conferenze…",search_courses:"Cerca corsi, autori…",no_results:"Nessun risultato",clear_filters:"Cancella filtri",market_title:"Mercato Veterinario",create_ad:"Crea Annuncio",ad_title:"Titolo annuncio",ad_category:"Categoria",ad_price:"Prezzo",ad_condition:"Condizione",ad_location:"Località",ad_emoji:"Emoji / Icona",ad_desc:"Descrizione",ad_preview:"Anteprima",publish_ad:"Pubblica Annuncio",jobs_title:"Lavoro Veterinario",publish_cv:"Pubblica CV",new_job:"+ Offerta",job_title_field:"Titolo offerta",job_company:"Azienda / Clinica",job_type:"Tipo contratto",job_location:"Località",job_salary:"Stipendio",job_desc:"Descrizione offerta",publish_job:"Pubblica Offerta",daily_report:"Report Giornaliero",suppliers_title:"Cataloghi Fornitori",become_supplier:"+ Diventa Fornitore",search_suppliers:"Cerca prodotti o fornitori…",back_catalogue:"Torna al catalogo",products_tab:"Prodotti",video_dim:"Video DIM",catalogue_tab:"Catalogo/Listino",clinic_ai:"Diagnosi Differenziale IA",clinic_calc:"Calcolatore Clinico",clinic_drugs:"Farmaci",clinic_protocols:"Protocolli",clinic_cases:"Casi SOAP",clinic_map:"Mappa Specialisti",history:"Cronologia",ai_history_title:"Cronologia Diagnosi",saved_cases:"caso salvato",saved_cases_pl:"casi salvati",compare:"Seleziona 2 per confrontare",clear_selection:"Annulla selezione",generate:"Genera Diagnosi",generating:"Generazione…",no_history:"Nessuna diagnosi generata.",try_again:"Riprova",profile_posts:"Pubblicazioni",profile_cases:"Casi",profile_certs:"Certificazioni",profile_stats:"Statistiche",edit_profile:"Modifica Profilo",save_changes:"Salva modifiche",name:"Nome",specialty:"Specialità",bio:"Biografia",saved_ok:"✓ Salvato!",settings_account:"Account",settings_appearance:"Aspetto",settings_notifications:"Notifiche",settings_privacy:"Privacy",send_feedback:"Invia Feedback Beta",cancel:"Annulla",close:"Chiudi",delete:"Elimina",back:"Indietro",confirm:"Conferma",edit:"Modifica",share:"Condividi",download:"Scarica",upload:"Carica",preview:"Anteprima",no_results_found:"Nessun risultato",loading:"Caricamento…",error:"Errore",retry:"Riprova",
  zh:{nav_home:"首页",nav_community:"社区",nav_learn:"学习",nav_market:"市场",nav_clinic:"诊所",nav_profile:"个人资料",appSub:"全球兽医网络",search_placeholder:"搜索同事、病例、培训…",messages:"消息",notifications:"通知",language:"语言",dark_mode:"深色模式",online:"在线",offline:"离线",typing:"正在输入…",send:"发送",attach_photo:"照片",attach_file:"文件",open:"打开",select_conv:"选择对话",new_group:"新建群组",follow:"关注",publish:"发布",write_post:"分享病例、文章或更新…",like:"点赞",sponsored:"赞助",live_now:"直播中",watch:"观看",register:"注册",suppliers:"供应商",order:"订购",contact:"联系",apply:"申请",save:"保存",urgent:"紧急",generate_ai:"生成AI诊断",analyzing:"分析中…",species:"物种",age:"年龄",sex:"性别",breed:"品种",symptoms:"临床症状",other_symptoms:"其他症状",anamnesis:"病史",results:"结果",urgency:"紧急程度",summary:"临床摘要",lab_interp:"实验室解释",differentials:"鉴别诊断",next_steps:"下一步",disclaimer:"AI辅助诊断——不替代临床检查。",calculator:"临床计算器",drug_db:"药物数据库",protocols:"临床方案",expert_map:"专家地图",cases:"SOAP病例",jobs:"职位",marketplace:"市场",training:"培训",settings:"设置",onb_welcome:"欢迎来到VetConnect",onb_sub:"全球兽医专业网络",onb_start:"开始",onb_spec:"您的专业是什么？",onb_country:"执业国家",onb_license:"执照号码",onb_interests:"选择您的兴趣领域",onb_suggestions:"建议关注的同事",onb_finish:"进入VetConnect",mark_all:"全部标为已读",notif_settings:"通知设置",search_empty:"没有找到",results_vets:"同事",results_cases:"临床病例",results_training:"培训",results_market:"市场"},login_title:"登录您的账户",login_email:"专业邮箱",login_password:"密码",login_forgot:"忘记密码？",login_enter:"登录",login_creating:"验证中…",login_social:"或",login_no_account:"还没有账户？",login_create:"创建免费账户",login_demo:"演示",login_sent:"邮件已发送！",login_sent_sub:"请查看您的收件箱。",login_back:"返回登录",feed_title:"动态",new_post:"新发布",load_more:"加载更多",remaining:"剩余",community_messages:"消息",community_groups:"讨论群组",community_meetings:"会议与视频通话",community_calendar:"统一日历",new_meeting:"新会议",new_group_title:"新建群组",group_name:"群组名称",add_members:"添加成员",invite_members:"邀请参与者",meeting_title:"会议标题",search_colleagues:"搜索同事…",selected_members:"名成员已选择",selected_members_pl:"名成员已选择",invited:"名参与者已邀请",invited_pl:"名参与者已邀请",create_group:"创建群组",schedule:"安排",video_call:"新视频通话",instant_room:"即时房间——分享链接",room_created:"视频房间已创建",copy_link:"复制链接",copied:"✓ 已复制！",learn_live:"直播与会议",learn_courses:"课程与认证",learn_promo:"推广",live_now_section:"正在直播",upcoming:"即将到来",broadcast:"广播",start_broadcast:"开始广播",broadcasting:"🔴 广播中…",schedule_broadcast:"安排",scheduled:"✓ 已安排！",published:"✓ 已发布！",enroll:"注册",enrolled:"✓ 已注册",search_events:"搜索会议、讲座…",search_courses:"搜索课程、作者…",no_results:"无结果",clear_filters:"清除筛选",market_title:"兽医市场",create_ad:"创建广告",ad_title:"广告标题",ad_category:"类别",ad_price:"价格",ad_condition:"状况",ad_location:"位置",ad_emoji:"表情/图标",ad_desc:"描述",ad_preview:"预览",publish_ad:"发布广告",jobs_title:"兽医职位",publish_cv:"发布简历",new_job:"+ 职位",job_title_field:"职位名称",job_company:"公司/诊所",job_type:"合同类型",job_location:"位置",job_salary:"薪资",job_desc:"职位描述",publish_job:"发布职位",daily_report:"每日报告",suppliers_title:"供应商目录",become_supplier:"+ 成为供应商",search_suppliers:"搜索产品或供应商…",back_catalogue:"返回目录",products_tab:"产品",video_dim:"DIM视频",catalogue_tab:"目录/价格表",clinic_ai:"AI鉴别诊断",clinic_calc:"临床计算器",clinic_drugs:"药物",clinic_protocols:"方案",clinic_cases:"SOAP病例",clinic_map:"专家地图",history:"历史",ai_history_title:"诊断历史",saved_cases:"个案例已保存",saved_cases_pl:"个案例已保存",compare:"选择2个进行比较",clear_selection:"清除选择",generate:"生成诊断",generating:"生成中…",no_history:"尚未生成诊断。",try_again:"重试",profile_posts:"发布",profile_cases:"病例",profile_certs:"认证",profile_stats:"统计",edit_profile:"编辑个人资料",save_changes:"保存更改",name:"姓名",specialty:"专业",bio:"简介",saved_ok:"✓ 已保存！",settings_account:"账户",settings_appearance:"外观",settings_notifications:"通知",settings_privacy:"隐私",send_feedback:"发送测试反馈",cancel:"取消",close:"关闭",delete:"删除",back:"返回",confirm:"确认",edit:"编辑",share:"分享",download:"下载",upload:"上传",preview:"预览",no_results_found:"无结果",loading:"加载中…",error:"错误",retry:"重试",
  ja:{nav_home:"ホーム",nav_community:"コミュニティ",nav_learn:"学習",nav_market:"マーケット",nav_clinic:"クリニック",nav_profile:"プロフィール",appSub:"グローバル獣医ネットワーク",search_placeholder:"同僚、症例、研修を検索…",messages:"メッセージ",notifications:"通知",language:"言語",dark_mode:"ダークモード",online:"オンライン",offline:"オフライン",typing:"入力中…",send:"送信",attach_photo:"写真",attach_file:"ファイル",open:"開く",select_conv:"会話を選択",new_group:"新しいグループ",follow:"フォロー",publish:"投稿",write_post:"症例、記事、最新情報を共有…",like:"いいね",sponsored:"スポンサー",live_now:"ライブ中",watch:"視聴",register:"登録",suppliers:"サプライヤー",order:"注文",contact:"連絡",apply:"応募",save:"保存",urgent:"緊急",generate_ai:"AI診断生成",analyzing:"分析中…",species:"種",age:"年齢",sex:"性別",breed:"品種",symptoms:"臨床症状",other_symptoms:"その他の症状",anamnesis:"病歴",results:"結果",urgency:"緊急度",summary:"臨床要約",lab_interp:"検査解釈",differentials:"鑑別診断",next_steps:"次のステップ",disclaimer:"AI支援診断—臨床検査の代替ではありません。",calculator:"臨床計算機",drug_db:"薬物データベース",protocols:"臨床プロトコル",expert_map:"専門家マップ",cases:"SOAPケース",jobs:"求人",marketplace:"マーケット",training:"研修",settings:"設定",onb_welcome:"VetConnectへようこそ",onb_sub:"獣医師のためのグローバル専門ネットワーク",onb_start:"始める",onb_spec:"あなたの専門は？",onb_country:"勤務国",onb_license:"ライセンス番号",onb_interests:"興味分野を選択",onb_suggestions:"フォロー推薦の同僚",onb_finish:"VetConnectに入る",mark_all:"すべて既読にする",notif_settings:"通知設定",search_empty:"結果なし",results_vets:"同僚",results_cases:"臨床症例",results_training:"研修",results_market:"マーケット"},login_title:"アカウントにサインイン",login_email:"プロフェッショナルメール",login_password:"パスワード",login_forgot:"パスワードを忘れましたか？",login_enter:"サインイン",login_creating:"確認中…",login_social:"または",login_no_account:"アカウントをお持ちでない方？",login_create:"無料アカウント作成",login_demo:"デモ",login_sent:"メール送信済み！",login_sent_sub:"受信トレイをご確認ください。",login_back:"ログインに戻る",feed_title:"フィード",new_post:"新投稿",load_more:"もっと読む",remaining:"残り",community_messages:"メッセージ",community_groups:"ディスカッショングループ",community_meetings:"ミーティング＆ビデオ通話",community_calendar:"統合カレンダー",new_meeting:"新しいミーティング",new_group_title:"新しいグループ",group_name:"グループ名",add_members:"メンバーを追加",invite_members:"参加者を招待",meeting_title:"ミーティングタイトル",search_colleagues:"同僚を検索…",selected_members:"名を選択済み",selected_members_pl:"名を選択済み",invited:"名を招待済み",invited_pl:"名を招待済み",create_group:"グループを作成",schedule:"スケジュール",video_call:"新しいビデオ通話",instant_room:"即席ルーム—リンクを共有",room_created:"ビデオルーム作成済み",copy_link:"リンクをコピー",copied:"✓ コピー済み！",learn_live:"ライブ＆学会",learn_courses:"コース＆認定",learn_promo:"プロモーション",live_now_section:"ライブ中",upcoming:"今後のイベント",broadcast:"配信",start_broadcast:"配信開始",broadcasting:"🔴 配信中…",schedule_broadcast:"スケジュール",scheduled:"✓ 予定済み！",published:"✓ 公開済み！",enroll:"登録",enrolled:"✓ 登録済み",search_events:"学会、講演を検索…",search_courses:"コース、著者を検索…",no_results:"結果なし",clear_filters:"フィルターをクリア",market_title:"獣医マーケットプレイス",create_ad:"広告を作成",ad_title:"広告タイトル",ad_category:"カテゴリー",ad_price:"価格",ad_condition:"状態",ad_location:"場所",ad_emoji:"絵文字/アイコン",ad_desc:"説明",ad_preview:"プレビュー",publish_ad:"広告を公開",jobs_title:"獣医求人",publish_cv:"履歴書を公開",new_job:"+ 求人",job_title_field:"求人タイトル",job_company:"企業/クリニック",job_type:"契約タイプ",job_location:"場所",job_salary:"給与",job_desc:"求人内容",publish_job:"求人を公開",daily_report:"日次レポート",suppliers_title:"サプライヤーカタログ",become_supplier:"+ サプライヤーになる",search_suppliers:"製品またはサプライヤーを検索…",back_catalogue:"カタログに戻る",products_tab:"製品",video_dim:"DIMビデオ",catalogue_tab:"カタログ/価格表",clinic_ai:"AI鑑別診断",clinic_calc:"臨床計算機",clinic_drugs:"薬物",clinic_protocols:"プロトコル",clinic_cases:"SOAPケース",clinic_map:"専門家マップ",history:"履歴",ai_history_title:"診断履歴",saved_cases:"件保存済み",saved_cases_pl:"件保存済み",compare:"2件を比較選択",clear_selection:"選択をクリア",generate:"診断を生成",generating:"生成中…",no_history:"まだ診断がありません。",try_again:"再試行",profile_posts:"投稿",profile_cases:"ケース",profile_certs:"認定",profile_stats:"統計",edit_profile:"プロフィールを編集",save_changes:"変更を保存",name:"名前",specialty:"専門",bio:"経歴",saved_ok:"✓ 保存済み！",settings_account:"アカウント",settings_appearance:"外観",settings_notifications:"通知",settings_privacy:"プライバシー",send_feedback:"ベータフィードバック送信",cancel:"キャンセル",close:"閉じる",delete:"削除",back:"戻る",confirm:"確認",edit:"編集",share:"共有",download:"ダウンロード",upload:"アップロード",preview:"プレビュー",no_results_found:"結果なし",loading:"読み込み中…",error:"エラー",retry:"再試行",
  ar:{nav_home:"الرئيسية",nav_community:"المجتمع",nav_learn:"التعلم",nav_market:"السوق",nav_clinic:"العيادة",nav_profile:"الملف",appSub:"شبكة البيطريين العالمية",search_placeholder:"ابحث عن زملاء، حالات، تدريب…",messages:"الرسائل",notifications:"الإشعارات",language:"اللغة",dark_mode:"الوضع الداكن",online:"متصل",offline:"غير متصل",typing:"يكتب…",send:"إرسال",attach_photo:"صورة",attach_file:"ملف",open:"فتح",select_conv:"اختر محادثة",new_group:"مجموعة جديدة",follow:"متابعة",publish:"نشر",write_post:"شارك حالة أو مقالاً…",like:"إعجاب",sponsored:"ممول",live_now:"مباشر",watch:"مشاهدة",register:"تسجيل",suppliers:"الموردون",order:"طلب",contact:"تواصل",apply:"تقديم",save:"حفظ",urgent:"عاجل",generate_ai:"إنشاء تشخيص ذكاء اصطناعي",analyzing:"جارٍ التحليل…",species:"النوع",age:"العمر",sex:"الجنس",breed:"السلالة",symptoms:"العلامات السريرية",other_symptoms:"علامات أخرى",anamnesis:"التاريخ المرضي",results:"النتائج",urgency:"الإلحاح",summary:"الملخص السريري",lab_interp:"تفسير المختبر",differentials:"التشخيص التفريقي",next_steps:"الخطوات التالية",disclaimer:"تشخيص بمساعدة الذكاء الاصطناعي — لا يحل محل الفحص السريري.",calculator:"الحاسبة السريرية",drug_db:"قاعدة بيانات الأدوية",protocols:"البروتوكولات السريرية",expert_map:"خريطة المتخصصين",cases:"حالات SOAP",jobs:"الوظائف",marketplace:"السوق",training:"التدريب",settings:"الإعدادات",onb_welcome:"مرحباً بك في VetConnect",onb_sub:"الشبكة المهنية العالمية لأطباء البيطرة",onb_start:"ابدأ",onb_spec:"ما هي تخصصك؟",onb_country:"بلد الممارسة",onb_license:"رقم الترخيص",onb_interests:"اختر مجالات اهتمامك",onb_suggestions:"زملاء مقترحون للمتابعة",onb_finish:"الدخول إلى VetConnect",mark_all:"تعليم الكل كمقروء",notif_settings:"إعدادات الإشعارات",search_empty:"لا نتائج لـ",results_vets:"زملاء",results_cases:"الحالات السريرية",results_training:"التدريب",results_market:"السوق"},login_title:"تسجيل الدخول إلى حسابك",login_email:"البريد المهني",login_password:"كلمة المرور",login_forgot:"نسيت كلمة المرور؟",login_enter:"تسجيل الدخول",login_creating:"جارٍ التحقق…",login_social:"أو",login_no_account:"ليس لديك حساب؟",login_create:"إنشاء حساب مجاني",login_demo:"تجريبي",login_sent:"تم إرسال البريد!",login_sent_sub:"تحقق من صندوق الوارد.",login_back:"العودة لتسجيل الدخول",feed_title:"موجز المنشورات",new_post:"منشور جديد",load_more:"تحميل المزيد",remaining:"متبقية",community_messages:"الرسائل",community_groups:"مجموعات النقاش",community_meetings:"الاجتماعات ومكالمات الفيديو",community_calendar:"التقويم الموحد",new_meeting:"اجتماع جديد",new_group_title:"مجموعة جديدة",group_name:"اسم المجموعة",add_members:"إضافة أعضاء",invite_members:"دعوة مشاركين",meeting_title:"عنوان الاجتماع",search_colleagues:"البحث عن زملاء…",selected_members:"عضو مختار",selected_members_pl:"أعضاء مختارون",invited:"مشارك مدعو",invited_pl:"مشاركون مدعوون",create_group:"إنشاء المجموعة",schedule:"جدولة",video_call:"مكالمة فيديو جديدة",instant_room:"غرفة فورية — شارك الرابط",room_created:"تم إنشاء غرفة الفيديو",copy_link:"نسخ الرابط",copied:"✓ تم النسخ!",learn_live:"البث المباشر والمؤتمرات",learn_courses:"الدورات والشهادات",learn_promo:"الترويج",live_now_section:"البث المباشر الآن",upcoming:"الفعاليات القادمة",broadcast:"البث",start_broadcast:"بدء البث",broadcasting:"🔴 يبث…",schedule_broadcast:"جدولة",scheduled:"✓ مجدول!",published:"✓ منشور!",enroll:"التسجيل",enrolled:"✓ مسجل",search_events:"البحث في المؤتمرات…",search_courses:"البحث في الدورات…",no_results:"لا نتائج",clear_filters:"مسح الفلاتر",market_title:"السوق البيطري",create_ad:"إنشاء إعلان",ad_title:"عنوان الإعلان",ad_category:"الفئة",ad_price:"السعر",ad_condition:"الحالة",ad_location:"الموقع",ad_emoji:"إيموجي / أيقونة",ad_desc:"الوصف",ad_preview:"معاينة",publish_ad:"نشر الإعلان",jobs_title:"وظائف بيطرية",publish_cv:"نشر السيرة الذاتية",new_job:"+ وظيفة",job_title_field:"المسمى الوظيفي",job_company:"الشركة / العيادة",job_type:"نوع العقد",job_location:"الموقع",job_salary:"الراتب",job_desc:"وصف الوظيفة",publish_job:"نشر الوظيفة",daily_report:"التقرير اليومي",suppliers_title:"كتالوجات الموردين",become_supplier:"+ أصبح موردًا",search_suppliers:"البحث في المنتجات أو الموردين…",back_catalogue:"العودة للكتالوج",products_tab:"المنتجات",video_dim:"فيديو DIM",catalogue_tab:"الكتالوج/قائمة الأسعار",clinic_ai:"التشخيص التفريقي بالذكاء الاصطناعي",clinic_calc:"الحاسبة السريرية",clinic_drugs:"الأدوية",clinic_protocols:"البروتوكولات",clinic_cases:"حالات SOAP",clinic_map:"خريطة المتخصصين",history:"السجل",ai_history_title:"سجل التشخيصات",saved_cases:"حالة محفوظة",saved_cases_pl:"حالات محفوظة",compare:"اختر 2 للمقارنة",clear_selection:"مسح الاختيار",generate:"إنشاء التشخيص",generating:"جارٍ الإنشاء…",no_history:"لم تُنشئ أي تشخيصات بعد.",try_again:"المحاولة مجددًا",profile_posts:"المنشورات",profile_cases:"الحالات",profile_certs:"الشهادات",profile_stats:"الإحصاءات",edit_profile:"تعديل الملف الشخصي",save_changes:"حفظ التغييرات",name:"الاسم",specialty:"التخصص",bio:"السيرة الذاتية",saved_ok:"✓ تم الحفظ!",settings_account:"الحساب",settings_appearance:"المظهر",settings_notifications:"الإشعارات",settings_privacy:"الخصوصية",send_feedback:"إرسال ملاحظات بيتا",cancel:"إلغاء",close:"إغلاق",delete:"حذف",back:"رجوع",confirm:"تأكيد",edit:"تعديل",share:"مشاركة",download:"تحميل",upload:"رفع",preview:"معاينة",no_results_found:"لا نتائج",loading:"تحميل…",error:"خطأ",retry:"إعادة المحاولة",
  ru:{nav_home:"Главная",nav_community:"Сообщество",nav_learn:"Обучение",nav_market:"Рынок",nav_clinic:"Клиника",nav_profile:"Профиль",appSub:"Глобальная ветеринарная сеть",search_placeholder:"Поиск коллег, случаев, курсов…",messages:"Сообщения",notifications:"Уведомления",language:"Язык",dark_mode:"Тёмный режим",online:"Онлайн",offline:"Не в сети",typing:"печатает…",send:"Отправить",attach_photo:"Фото",attach_file:"Файл",open:"Открыть",select_conv:"Выберите беседу",new_group:"Новая группа",follow:"Подписаться",publish:"Опубликовать",write_post:"Поделитесь случаем, статьёй…",like:"Нравится",sponsored:"Спонсировано",live_now:"В ЭФИРЕ",watch:"Смотреть",register:"Записаться",suppliers:"Поставщики",order:"Заказать",contact:"Связаться",apply:"Откликнуться",save:"Сохранить",urgent:"Срочно",generate_ai:"Создать ИИ-диагноз",analyzing:"Анализирую…",species:"Вид",age:"Возраст",sex:"Пол",breed:"Порода",symptoms:"Клинические признаки",other_symptoms:"Другие признаки",anamnesis:"Анамнез",results:"Результаты",urgency:"Срочность",summary:"Клинический итог",lab_interp:"Интерпретация лаборатории",differentials:"Дифференциальные диагнозы",next_steps:"Следующие шаги",disclaimer:"ИИ-диагностика — не заменяет клинический осмотр.",calculator:"Клинический калькулятор",drug_db:"База данных препаратов",protocols:"Клинические протоколы",expert_map:"Карта специалистов",cases:"Случаи SOAP",jobs:"Вакансии",marketplace:"Маркетплейс",training:"Обучение",settings:"Настройки",onb_welcome:"Добро пожаловать в VetConnect",onb_sub:"Глобальная профессиональная сеть ветеринаров",onb_start:"Начать",onb_spec:"Ваша специализация?",onb_country:"Страна практики",onb_license:"Номер лицензии",onb_interests:"Выберите области интереса",onb_suggestions:"Рекомендуемые коллеги",onb_finish:"Войти в VetConnect",mark_all:"Отметить всё прочитанным",notif_settings:"Настройки уведомлений",search_empty:"Нет результатов для",results_vets:"Коллеги",results_cases:"Клинические случаи",results_training:"Обучение",results_market:"Рынок"},login_title:"Войти в аккаунт",login_email:"Профессиональный email",login_password:"Пароль",login_forgot:"Забыли пароль?",login_enter:"Войти",login_creating:"Проверка…",login_social:"или",login_no_account:"Нет аккаунта?",login_create:"Создать бесплатный аккаунт",login_demo:"Демо",login_sent:"Email отправлен!",login_sent_sub:"Проверьте входящие.",login_back:"Назад ко входу",feed_title:"Новости",new_post:"Новая публикация",load_more:"Загрузить ещё",remaining:"осталось",community_messages:"Сообщения",community_groups:"Группы обсуждений",community_meetings:"Встречи и видеозвонки",community_calendar:"Объединённый календарь",new_meeting:"Новая встреча",new_group_title:"Новая группа",group_name:"Название группы",add_members:"Добавить участников",invite_members:"Пригласить участников",meeting_title:"Название встречи",search_colleagues:"Поиск коллег…",selected_members:"участник выбран",selected_members_pl:"участника выбрано",invited:"участник приглашён",invited_pl:"участника приглашено",create_group:"Создать группу",schedule:"Запланировать",video_call:"Новый видеозвонок",instant_room:"Мгновенная комната — поделитесь ссылкой",room_created:"Видеокомната создана",copy_link:"Скопировать ссылку",copied:"✓ Скопировано!",learn_live:"Прямой эфир и конгрессы",learn_courses:"Курсы и сертификации",learn_promo:"Реклама",live_now_section:"В эфире сейчас",upcoming:"Предстоящие события",broadcast:"Трансляция",start_broadcast:"Начать трансляцию",broadcasting:"🔴 Трансляция…",schedule_broadcast:"Запланировать",scheduled:"✓ Запланировано!",published:"✓ Опубликовано!",enroll:"Записаться",enrolled:"✓ Записано",search_events:"Поиск конгрессов…",search_courses:"Поиск курсов…",no_results:"Нет результатов",clear_filters:"Очистить фильтры",market_title:"Ветеринарный маркетплейс",create_ad:"Создать объявление",ad_title:"Заголовок объявления",ad_category:"Категория",ad_price:"Цена",ad_condition:"Состояние",ad_location:"Местоположение",ad_emoji:"Эмодзи / Иконка",ad_desc:"Описание",ad_preview:"Предпросмотр",publish_ad:"Опубликовать объявление",jobs_title:"Ветеринарные вакансии",publish_cv:"Опубликовать резюме",new_job:"+ Вакансия",job_title_field:"Название вакансии",job_company:"Компания / Клиника",job_type:"Тип контракта",job_location:"Местоположение",job_salary:"Зарплата",job_desc:"Описание вакансии",publish_job:"Опубликовать вакансию",daily_report:"Ежедневный отчёт",suppliers_title:"Каталоги поставщиков",become_supplier:"+ Стать поставщиком",search_suppliers:"Поиск продуктов или поставщиков…",back_catalogue:"Назад к каталогу",products_tab:"Продукты",video_dim:"Видео DIM",catalogue_tab:"Каталог/Прайс",clinic_ai:"ИИ-дифференциальная диагностика",clinic_calc:"Клинический калькулятор",clinic_drugs:"Препараты",clinic_protocols:"Протоколы",clinic_cases:"Случаи SOAP",clinic_map:"Карта специалистов",history:"История",ai_history_title:"История диагнозов",saved_cases:"случай сохранён",saved_cases_pl:"случая сохранено",compare:"Выберите 2 для сравнения",clear_selection:"Сбросить выбор",generate:"Создать диагноз",generating:"Создание…",no_history:"Диагнозов ещё нет.",try_again:"Повторить",profile_posts:"Публикации",profile_cases:"Случаи",profile_certs:"Сертификаты",profile_stats:"Статистика",edit_profile:"Редактировать профиль",save_changes:"Сохранить изменения",name:"Имя",specialty:"Специализация",bio:"Биография",saved_ok:"✓ Сохранено!",settings_account:"Аккаунт",settings_appearance:"Внешний вид",settings_notifications:"Уведомления",settings_privacy:"Конфиденциальность",send_feedback:"Отправить бета-отзыв",cancel:"Отмена",close:"Закрыть",delete:"Удалить",back:"Назад",confirm:"Подтвердить",edit:"Редактировать",share:"Поделиться",download:"Скачать",upload:"Загрузить",preview:"Предпросмотр",no_results_found:"Нет результатов",loading:"Загрузка…",error:"Ошибка",retry:"Повторить",
  nl:{nav_home:"Start",nav_community:"Gemeenschap",nav_learn:"Leren",nav_market:"Markt",nav_clinic:"Kliniek",nav_profile:"Profiel",appSub:"Wereldwijd Veterinair Netwerk",search_placeholder:"Zoek collega's, gevallen, opleiding…",messages:"Berichten",notifications:"Meldingen",language:"Taal",dark_mode:"Donkere Modus",online:"Online",offline:"Offline",typing:"typt…",send:"Verzenden",attach_photo:"Foto",attach_file:"Bestand",open:"Openen",select_conv:"Selecteer een gesprek",new_group:"Nieuwe groep",follow:"Volgen",publish:"Publiceren",write_post:"Deel een casus, artikel of nieuws…",like:"Vind ik leuk",sponsored:"Gesponsord",live_now:"LIVE",watch:"Bekijken",register:"Inschrijven",suppliers:"Leveranciers",order:"Bestellen",contact:"Contact",apply:"Solliciteren",save:"Opslaan",urgent:"Urgent",generate_ai:"AI Diagnose Genereren",analyzing:"Analyseren…",species:"Soort",age:"Leeftijd",sex:"Geslacht",breed:"Ras",symptoms:"Klinische Tekens",other_symptoms:"Andere Tekens",anamnesis:"Anamnese",results:"Resultaten",urgency:"Urgentie",summary:"Klinische Samenvatting",lab_interp:"Laboratoriuminterpretatie",differentials:"Differentiaaldiagnoses",next_steps:"Volgende Stappen",disclaimer:"AI-ondersteunde diagnose — vervangt het klinisch onderzoek niet.",calculator:"Klinische Calculator",drug_db:"Geneesmiddelendatabase",protocols:"Klinische Protocollen",expert_map:"Specialistenkaart",cases:"SOAP Gevallen",jobs:"Vacatures",marketplace:"Marktplaats",training:"Opleiding",settings:"Instellingen",onb_welcome:"Welkom bij VetConnect",onb_sub:"Het wereldwijde professionele netwerk voor dierenartsen",onb_start:"Beginnen",onb_spec:"Wat is uw specialiteit?",onb_country:"Land van praktijk",onb_license:"Licentienummer",onb_interests:"Selecteer uw interessegebieden",onb_suggestions:"Aanbevolen collega's om te volgen",onb_finish:"VetConnect betreden",mark_all:"Alles als gelezen markeren",notif_settings:"Meldingsinstellingen",search_empty:"Geen resultaten voor",results_vets:"Collega's",results_cases:"Klinische gevallen",results_training:"Opleiding",results_market:"Markt"},
  pl:{nav_home:"Strona główna",nav_community:"Społeczność",nav_learn:"Nauka",nav_market:"Rynek",nav_clinic:"Klinika",nav_profile:"Profil",appSub:"Globalna Sieć Weterynaryjna",search_placeholder:"Szukaj kolegów, przypadków, szkoleń…",messages:"Wiadomości",notifications:"Powiadomienia",language:"Język",dark_mode:"Tryb Ciemny",online:"Online",offline:"Offline",typing:"pisze…",send:"Wyślij",attach_photo:"Zdjęcie",attach_file:"Plik",open:"Otwórz",select_conv:"Wybierz rozmowę",new_group:"Nowa grupa",follow:"Obserwuj",publish:"Opublikuj",write_post:"Podziel się przypadkiem, artykułem…",like:"Lubię to",sponsored:"Sponsorowane",live_now:"NA ŻYWO",watch:"Oglądaj",register:"Zapisz się",suppliers:"Dostawcy",order:"Zamów",contact:"Kontakt",apply:"Aplikuj",save:"Zapisz",urgent:"Pilne",generate_ai:"Generuj diagnozę AI",analyzing:"Analizuję…",species:"Gatunek",age:"Wiek",sex:"Płeć",breed:"Rasa",symptoms:"Objawy Kliniczne",other_symptoms:"Inne Objawy",anamnesis:"Wywiad",results:"Wyniki",urgency:"Pilność",summary:"Podsumowanie Kliniczne",lab_interp:"Interpretacja Laboratoryjna",differentials:"Diagnozy Różnicowe",next_steps:"Następne Kroki",disclaimer:"Diagnoza wspomagana AI — nie zastępuje badania klinicznego.",calculator:"Kalkulator Kliniczny",drug_db:"Baza Leków",protocols:"Protokoły Kliniczne",expert_map:"Mapa Specjalistów",cases:"Przypadki SOAP",jobs:"Praca",marketplace:"Rynek",training:"Szkolenia",settings:"Ustawienia",onb_welcome:"Witamy w VetConnect",onb_sub:"Globalna sieć zawodowa dla weterynarzy",onb_start:"Rozpocznij",onb_spec:"Jaka jest Twoja specjalność?",onb_country:"Kraj praktyki",onb_license:"Numer licencji",onb_interests:"Wybierz obszary zainteresowań",onb_suggestions:"Sugerowani koledzy do obserwowania",onb_finish:"Wejdź do VetConnect",mark_all:"Oznacz wszystko jako przeczytane",notif_settings:"Ustawienia powiadomień",search_empty:"Brak wyników dla",results_vets:"Koledzy",results_cases:"Przypadki kliniczne",results_training:"Szkolenia",results_market:"Rynek"},login_title:"Zaloguj się na swoje konto",login_email:"Email zawodowy",login_password:"Hasło",login_forgot:"Zapomniałeś hasła?",login_enter:"Zaloguj",login_creating:"Weryfikacja…",login_social:"lub",login_no_account:"Nie masz konta?",login_create:"Utwórz bezpłatne konto",login_demo:"Demo",login_sent:"Email wysłany!",login_sent_sub:"Sprawdź swoją skrzynkę.",login_back:"Powrót do logowania",feed_title:"Aktualności",new_post:"Nowa publikacja",load_more:"Załaduj więcej",remaining:"pozostałych",community_messages:"Wiadomości",community_groups:"Grupy Dyskusyjne",community_meetings:"Spotkania i Rozmowy Wideo",community_calendar:"Ujednolicony Kalendarz",new_meeting:"Nowe Spotkanie",new_group_title:"Nowa Grupa",group_name:"Nazwa grupy",add_members:"Dodaj członków",invite_members:"Zaproś uczestników",meeting_title:"Tytuł spotkania",search_colleagues:"Szukaj kolegów…",selected_members:"członek wybrany",selected_members_pl:"członków wybranych",invited:"uczestnik zaproszony",invited_pl:"uczestników zaproszonych",create_group:"Utwórz Grupę",schedule:"Zaplanuj",video_call:"Nowa Rozmowa Wideo",instant_room:"Natychmiastowy pokój — udostępnij link",room_created:"Pokój wideo utworzony",copy_link:"Kopiuj link",copied:"✓ Skopiowano!",learn_live:"Na Żywo i Kongresy",learn_courses:"Kursy i Certyfikacje",learn_promo:"Promocja",live_now_section:"Teraz Na Żywo",upcoming:"Nadchodzące Wydarzeniasło",broadcast:"Transmisja",start_broadcast:"Rozpocznij transmisję",broadcasting:"🔴 Transmisja…",schedule_broadcast:"Zaplanuj",scheduled:"✓ Zaplanowano!",published:"✓ Opublikowano!",enroll:"Zapisz się",enrolled:"✓ Zapisano",search_events:"Szukaj kongresów…",search_courses:"Szukaj kursów…",no_results:"Brak wyników",clear_filters:"Wyczyść filtry",market_title:"Weterynaryjny Rynek",create_ad:"Utwórz Ogłoszenie",ad_title:"Tytuł ogłoszenia",ad_category:"Kategoria",ad_price:"Cena",ad_condition:"Stan",ad_location:"Lokalizacja",ad_emoji:"Emoji / Ikona",ad_desc:"Opis",ad_preview:"Podgląd",publish_ad:"Opublikuj Ogłoszenie",jobs_title:"Weterynaryjne Oferty Pracy",publish_cv:"Opublikuj CV",new_job:"+ Oferta",job_title_field:"Tytuł stanowiska",job_company:"Firma / Klinika",job_type:"Rodzaj umowy",job_location:"Lokalizacja",job_salary:"Wynagrodzenie",job_desc:"Opis stanowiska",publish_job:"Opublikuj Ofertę",daily_report:"Raport Dzienny",suppliers_title:"Katalogi Dostawców",become_supplier:"+ Zostań dostawcą",search_suppliers:"Szukaj produktów lub dostawców…",back_catalogue:"Powrót do katalogu",products_tab:"Produkty",video_dim:"Wideo DIM",catalogue_tab:"Katalog/Cennik",clinic_ai:"Diagnostyka Różnicowa AI",clinic_calc:"Kalkulator Kliniczny",clinic_drugs:"Leki",clinic_protocols:"Protokoły",clinic_cases:"Przypadki SOAP",clinic_map:"Mapa Specjalistów",history:"Historia",ai_history_title:"Historia Diagnoz",saved_cases:"przypadek zapisany",saved_cases_pl:"przypadki zapisane",compare:"Wybierz 2 do porównania",clear_selection:"Wyczyść wybór",generate:"Generuj Diagnozę",generating:"Generowanie…",no_history:"Nie wygenerowano jeszcze diagnoz.",try_again:"Spróbuj ponownie",profile_posts:"Publikacje",profile_cases:"Przypadki",profile_certs:"Certyfikacje",profile_stats:"Statystyki",edit_profile:"Edytuj Profil",save_changes:"Zapisz zmiany",name:"Imię i nazwisko",specialty:"Specjalizacja",bio:"Biografia",saved_ok:"✓ Zapisano!",settings_account:"Konto",settings_appearance:"Wygląd",settings_notifications:"Powiadomienia",settings_privacy:"Prywatność",send_feedback:"Wyślij opinię beta",cancel:"Anuluj",close:"Zamknij",delete:"Usuń",back:"Wstecz",confirm:"Potwierdź",edit:"Edytuj",share:"Udostępnij",download:"Pobierz",upload:"Prześlij",preview:"Podgląd",no_results_found:"Brak wyników",loading:"Ładowanie…",error:"Błąd",retry:"Spróbuj ponownie",
};

const getTR = (lang, key) => (TR[lang]||TR.pt)[key] || TR.pt[key] || key;

// ── Reusable SearchBar with submit button ─────────────────────────────────────
function SearchBar({ value, onChange, onSearch, placeholder, C, style={} }) {
  const handleKey = e => { if(e.key==="Enter") onSearch(value); };
  return (
    <div style={{display:"flex",gap:0,borderRadius:9,overflow:"hidden",border:`1.5px solid ${C.border}`,background:C.bg,...style}}>
      <input
        value={value}
        onChange={e=>onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        style={{flex:1,border:"none",outline:"none",padding:"9px 14px",fontSize:13,background:"transparent",color:C.text,minWidth:0}}
      />
      <button
        onClick={()=>onSearch(value)}
        style={{background:C.teal,border:"none",cursor:"pointer",padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"}}
        aria-label="Pesquisar"
      >
        <Icon d={ic.search} size={16} color="#fff"/>
      </button>
    </div>
  );
}
// ── Design helpers ────────────────────────────────────────────────────────────
const card = (C, extra={}) => ({background:C.surface,borderRadius:14,padding:18,boxShadow:`0 1px 6px rgba(0,0,0,0.1)`,marginBottom:14,border:`1px solid ${C.border}`,...extra});
const btn = (C, variant="primary", sm=false) => ({background:variant==="primary"?C.teal:variant==="danger"?C.rose:"transparent",color:variant==="outline"?C.teal:"#fff",border:variant==="outline"?`1.5px solid ${C.teal}`:"none",borderRadius:9,cursor:"pointer",fontWeight:600,transition:"all .15s",padding:sm?"6px 12px":"9px 18px",fontSize:sm?12:13.5,display:"inline-flex",alignItems:"center",gap:6});
const inp = (C) => ({width:"100%",border:`1.5px solid ${C.border}`,borderRadius:9,padding:"10px 14px",fontSize:14,outline:"none",background:C.bg,color:C.text,transition:"border .15s",boxSizing:"border-box"});
const tag = (color) => ({background:color+"18",color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,display:"inline-block"});
const ava = (C, size=40, online=false) => ({width:size,height:size,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${C.teal},${C.tealL})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*0.35,boxShadow:online?`0 0 0 2px ${C.surface},0 0 0 4px ${C.emerald}`:"none"});

// ── Mock Data ─────────────────────────────────────────────────────────────────
const SPECIALTIES = ["Medicina Interna","Cirurgia","Dermatologia","Oncologia","Imagiologia","Cardiologia","Neurologia","Ortopedia","Oftalmologia","Anestesia","Medicina de Urgência","Medicina Preventiva","Nutrição Clínica","Reprodução","Exóticos"];
const LIVE_EVENTS = [
  {id:1,title:"Congresso Nacional de Medicina Veterinária 2024",speaker:"Vários Oradores",speakerAvatar:"CN",date:"Hoje, 14:00",duration:"3h",viewers:1847,status:"live",price:"Gratuito",tags:["Congresso"],icon:"🏛️",slideTitle:"Avanços em Medicina Veterinária 2024",slideSubtitle:"Mesa redonda: Diagnóstico por imagem e terapêutica minimamente invasiva",program:"14:00 Abertura · 14:30 Imagiologia · 15:30 Cirurgia · 16:30 Mesa Redonda",cpd:4},
  {id:2,title:"Palestra: Endocrinologia Felina — Casos Clínicos",speaker:"Dra. Ana Ferreira",speakerAvatar:"AF",date:"Hoje, 18:00",duration:"1h30",viewers:423,status:"live",price:"Gratuito",tags:["Endocrinologia"],icon:"🐱",slideTitle:"Hipertiroidismo Felino",slideSubtitle:"Diagnóstico diferencial e opções terapêuticas",program:"18:00 Intro · 18:20 Diagnóstico · 19:00 Tratamento · 19:20 Q&A",cpd:2},
  {id:3,title:"Workshop: Ecografia Abdominal Canina",speaker:"Dr. João Neves",speakerAvatar:"JN",date:"Amanhã, 10:00",duration:"4h",viewers:0,status:"upcoming",price:"€49",tags:["Imagiologia"],icon:"📡",slideTitle:"Ecografia Abdominal",slideSubtitle:"Sistema hepato-biliar, renal e gastrointestinal",program:"10:00 Técnica · 11:00 Hepato-biliar · 12:00 Rins · 13:00 GI",cpd:6},
  {id:4,title:"Simpósio de Oncologia Veterinária",speaker:"Dr. Pedro Costa",speakerAvatar:"PC",date:"15 Jul, 09:00",duration:"6h",viewers:0,status:"upcoming",price:"€89",tags:["Oncologia"],icon:"🎗️",slideTitle:"Oncologia: Estado da Arte",slideSubtitle:"Quimioterapia, imunoterapia e cuidados paliativos",program:"09:00 Abertura · 10:00 QT · 11:30 Imunoterapia · 14:00 Paliativos",cpd:8},
];
const COURSES = [
  {id:1,title:"Dermatologia Veterinária Avançada",type:"Curso",price:"€249",rating:4.9,reviews:127,author:"Dra. Marta Lima",duration:"32h",icon:"📚",cpd:20},
  {id:2,title:"ECG Felino: Interpretação Prática",type:"Webinar",price:"€89",rating:4.8,reviews:84,author:"Dr. João Neves",duration:"8h",icon:"🫀",cpd:6},
  {id:3,title:"Nutrição Clínica Canina",type:"Certificação",price:"€399",rating:4.7,reviews:213,author:"Dra. Sofia Reis",duration:"56h",icon:"🎓",cpd:40},
  {id:4,title:"Anestesia de Alto Risco",type:"Masterclass",price:"€179",rating:4.9,reviews:96,author:"Dr. Rui Santos",duration:"12h",icon:"💉",cpd:10},
  {id:5,title:"Guia Clínico de Medicina Interna Felina",type:"E-book",price:"€29",rating:4.8,reviews:54,author:"Dra. Ana Ferreira",duration:"PDF · 210 págs",icon:"📖",cpd:0},
  {id:6,title:"Atlas de Dermatologia Veterinária",type:"E-book",price:"€39",rating:4.9,reviews:38,author:"Dra. Marta Lima",duration:"PDF · 320 págs",icon:"📖",cpd:0},
];
const MARKET_ITEMS = [
  {id:1,title:"Analisador Hematológico Vet ABC Plus",cat:"Equipamento",price:"€3.200",cond:"Usado - Bom",loc:"Lisboa",seller:"Clínica VetPremium",img:"🔬",rating:4.5,verified:true},
  {id:2,title:"Clínica Veterinária c/ carteira clientes",cat:"Negócio",price:"€95.000",cond:"Em funcionamento",loc:"Porto",seller:"Dr. Manuel Sousa",img:"🏥",rating:5.0,verified:true},
  {id:3,title:"Stock Antibióticos - Lote 2024",cat:"Stock",price:"€1.800",cond:"Novo",loc:"Braga",seller:"MedVet Lda",img:"💊",rating:4.8,verified:false},
  {id:4,title:"Ecógrafo MyLab X8 VET",cat:"Equipamento",price:"€8.500",cond:"Usado - Ótimo",loc:"Coimbra",seller:"Dra. Ana Pinto",img:"📡",rating:4.7,verified:true},
];
const SUPPLIERS = [
  {id:1,name:"IDEXX Laboratories",cat:"Laboratório Diagnóstico",icon:"🧬",color:"#0D7377",desc:"Líder mundial em diagnóstico veterinário in-house e referência.",
    products:[{name:"Catalyst One Analyzer",ref:"CAT-001",price:"€8.900",unit:"equip.",desc:"25 parâmetros em 8 min."},{name:"ProCyte Dx Hematology",ref:"PCD-002",price:"€6.200",unit:"equip.",desc:"Hemograma completo em 2 min."},{name:"SNAP 4Dx Plus",ref:"SNP-003",price:"€6,50",unit:"teste",desc:"Heartworm, Lyme, Ehrlichia."},{name:"SDMA Renal Test",ref:"SDM-004",price:"€4,80",unit:"teste",desc:"Doença renal precoce."}],
    media:[
      {type:"video",title:"Novo SDMA — Diagnóstico Renal Precoce",thumb:"🔬",duration:"2:15",date:"Jun 2024",desc:"Demonstração do novo painel SDMA para detecção precoce de doença renal antes dos sinais clínicos.",highlight:true},
      {type:"video",title:"Catalyst One — Como usar em clínica",thumb:"⚗️",duration:"4:30",date:"Mai 2024",desc:"Guia passo-a-passo de utilização do analisador Catalyst One. Ideal para técnicos e veterinários."},
      {type:"doc",title:"Catálogo Completo IDEXX 2024",ext:"PDF",size:"4.2 MB",date:"Jan 2024",desc:"Catálogo completo de produtos, painéis e equipamentos IDEXX para medicina veterinária.",pages:"48 págs"},
      {type:"doc",title:"Guia de Interpretação de Resultados",ext:"PDF",size:"2.1 MB",date:"Mar 2024",desc:"Guia clínico de interpretação de resultados laboratoriais. Inclui valores de referência por espécie.",pages:"32 págs"},
      {type:"doc",title:"Protocolo de Integração Laboratorial",ext:"DOCX",size:"890 KB",date:"Fev 2024",desc:"Protocolo técnico para integração dos equipamentos IDEXX com software de gestão clínica.",pages:"18 págs"},
    ]},
  {id:2,name:"Agrolimen Vet Portugal",cat:"Distribuidor",icon:"📦",color:"#6C3FC7",desc:"Distribuição nacional de medicamentos e vacinas desde 1985.",
    products:[{name:"Amoxicilina 500mg",ref:"AMX-500",price:"€0,18",unit:"cáps.",desc:"Embalagens de 100-1000."},{name:"Vacina Nobivac DHPPi",ref:"VAC-DHP",price:"€3,40",unit:"dose",desc:"Polivalente canina."},{name:"Colar isabelino S/M/L",ref:"COL-SML",price:"€2,10",unit:"unid.",desc:"Pack 10 unidades."},{name:"Seringa 10mL",ref:"SRG-10G",price:"€0,08",unit:"unid.",desc:"Caixa 100 unidades."}],
    media:[
      {type:"video",title:"Apresentação Novidades Agrolimen 2024",thumb:"📦",duration:"3:45",date:"Jun 2024",desc:"Novos produtos e condições comerciais para clínicas veterinárias parceiras.",highlight:true},
      {type:"doc",title:"Lista de Preços 2024 — Medicamentos",ext:"PDF",size:"1.8 MB",date:"Jan 2024",desc:"Preçário actualizado de medicamentos veterinários. Válido de Janeiro a Dezembro 2024.",pages:"22 págs"},
      {type:"doc",title:"Condições Gerais de Fornecimento",ext:"PDF",size:"650 KB",date:"Jan 2024",desc:"Termos, prazos de entrega, condições de pagamento e política de devoluções.",pages:"8 págs"},
      {type:"doc",title:"Fichas de Segurança — Antibióticos",ext:"ZIP",size:"5.4 MB",date:"Mar 2024",desc:"Conjunto de fichas de segurança de todos os antibióticos veterinários do catálogo."},
    ]},
  {id:3,name:"Royal Canin Pro",cat:"Nutrição Veterinária",icon:"🐾",color:"#E8A838",desc:"Nutrição veterinária de precisão para suporte clínico.",
    products:[{name:"Renal Canine 2kg",ref:"REN-C2K",price:"€18,50",unit:"saco",desc:"Baixo em fósforo."},{name:"Gastrointestinal Feline 4kg",ref:"GI-F4K",price:"€22,80",unit:"saco",desc:"Alta digestibilidade."},{name:"Recovery Liquid 200mL",ref:"REC-200",price:"€4,20",unit:"lata",desc:"Nutrição entérica."},{name:"Hepatic Canine 6kg",ref:"HEP-C6K",price:"€34,90",unit:"saco",desc:"Baixo teor de cobre."}],
    media:[
      {type:"video",title:"Nova Dieta Renal 2024 — Reformulação",thumb:"🐶",duration:"3:00",date:"Jun 2024",desc:"Apresentação da reformulação da dieta Renal com Omega-3 EPA+DHA aumentado. Aprovada por nefrologistas.",highlight:true},
      {type:"video",title:"Nutrição Clínica — Casos Práticos",thumb:"🐱",duration:"8:20",date:"Abr 2024",desc:"Webinar gravado sobre aplicação das dietas terapêuticas em casos clínicos reais."},
      {type:"doc",title:"Guia de Nutrição Clínica Veterinária",ext:"PDF",size:"6.1 MB",date:"Jan 2024",desc:"Guia completo de indicações, contra-indicações e transição alimentar para todas as dietas clínicas.",pages:"64 págs"},
      {type:"doc",title:"Tabela Comparativa de Dietas Terapêuticas",ext:"PDF",size:"1.2 MB",date:"Mar 2024",desc:"Comparação nutricional entre todas as dietas terapêuticas Royal Canin Veterinary.",pages:"12 págs"},
    ]},
  {id:4,name:"VetEquip Pro",cat:"Equipamentos",icon:"⚕️",color:"#E05C6A",desc:"Equipamentos cirúrgicos e de diagnóstico de alta qualidade.",
    products:[{name:"Monitor Multiparamétrico",ref:"MON-MP1",price:"€2.400",unit:"equip.",desc:"SpO2, ECG, NIBP, EtCO2."},{name:"Bisturi Elétrico 300W",ref:"BST-300",price:"€1.850",unit:"equip.",desc:"Corte e coagulação."},{name:"Laringoscópio LED",ref:"LAR-LED",price:"€210",unit:"equip.",desc:"Set 4 lâminas LED."},{name:"Mesa Cirúrgica Hidráulica",ref:"MSC-HYD",price:"€3.200",unit:"equip.",desc:"Altura 55-90cm."}],
    media:[
      {type:"video",title:"Monitor Multiparamétrico — Demo Completa",thumb:"📡",duration:"5:10",date:"Mai 2024",desc:"Demonstração completa do novo monitor: configuração, alarmes, conectividade e manutenção.",highlight:true},
      {type:"video",title:"Bisturi Elétrico 300W — Técnicas Cirúrgicas",thumb:"⚕️",duration:"6:45",date:"Mar 2024",desc:"Guia de utilização do bisturi elétrico com demonstração de modos de corte e coagulação."},
      {type:"doc",title:"Manual Técnico — Monitor MP1",ext:"PDF",size:"8.3 MB",date:"Fev 2024",desc:"Manual completo de instalação, operação e manutenção do Monitor Multiparamétrico MP1.",pages:"96 págs"},
      {type:"doc",title:"Catálogo Equipamentos Cirúrgicos 2024",ext:"PDF",size:"3.7 MB",date:"Jan 2024",desc:"Catálogo completo de equipamentos cirúrgicos com especificações técnicas e preços.",pages:"36 págs"},
      {type:"doc",title:"Certificados CE e ISO",ext:"ZIP",size:"2.1 MB",date:"Jan 2024",desc:"Certificados de conformidade europeia e ISO 13485 para todos os equipamentos."},
    ]},
];
const DRUGS = [
  {name:"Amoxicilina-Clavulanato",dose:"12,5-25 mg/kg",freq:"BID",route:"PO/IV",species:"Cão, Gato",notes:"Ajuste em IR"},
  {name:"Furosemida",dose:"1-4 mg/kg",freq:"BID-TID",route:"PO/IV/IM",species:"Cão, Gato",notes:"Monitorizar eletrólitos"},
  {name:"Metronidazol",dose:"15-25 mg/kg",freq:"BID",route:"PO/IV",species:"Cão, Gato",notes:"Cuidado em doses altas"},
  {name:"Tramadol",dose:"2-5 mg/kg",freq:"BID-TID",route:"PO",species:"Cão",notes:"Em gatos 1-2 mg/kg SID"},
  {name:"Meloxicam",dose:"0,1 mg/kg",freq:"SID",route:"PO/SC",species:"Cão, Gato",notes:"Evitar em IR/doença hepática"},
  {name:"Atenolol",dose:"6,25-12,5mg gato / 0,25-1mg/kg cão",freq:"SID-BID",route:"PO",species:"Cão, Gato",notes:"CMH felina"},
  {name:"Prednisolona",dose:"1-2 mg/kg",freq:"SID",route:"PO",species:"Cão, Gato",notes:"Desmame gradual"},
  {name:"Maropitant",dose:"1 mg/kg",freq:"SID",route:"SC/PO",species:"Cão, Gato",notes:"Evitar <16 semanas"},
];
const PROTOCOLS = [
  {id:1,title:"Protocolo de Fluidoterapia IV",spec:"Medicina de Urgência",author:"Dr. Rui Santos",icon:"💧",content:"Taxa manutenção: 40-60 mL/kg/dia cão; 30-40 mL/kg/dia gato.\nChoque: 10-20 mL/kg em 15-20 min (cristalóide), repetir x3 máx.\nMonitorizar: lactato, PVC, débito urinário."},
  {id:2,title:"Protocolo de Anestesia de Alto Risco",spec:"Anestesia",author:"Dr. Rui Santos",icon:"💉",content:"Pré-med: Metadona 0,2mg/kg + Midazolam 0,2mg/kg IM.\nIndução: Propofol TCI ou Alfaxalona 2mg/kg IV.\nManutenção: Isoflurano 1-1,5% + CRI Fentanil 5-10µg/kg/h.\nMonitorizar: SpO2, EtCO2, PA, temperatura."},
  {id:3,title:"Protocolo RECOVER — RCP Básico",spec:"Medicina de Urgência",author:"VetConnect",icon:"❤️",content:"C-A-B: 100-120 compressões/min, 1/3 do diâmetro torácico.\nVentilação: 10/min, VT 10mL/kg.\nAdrenalina: 0,01mg/kg IV q3-5min.\nAtropina: 0,04mg/kg IV (assístolia).\nDesfibrilhação: 2-4 J/kg."},
];
const SYMPTOMS = ["Poliúria/Polidipsia","Vómito","Diarreia","Letargia","Anorexia","Perda de peso","Tosse","Dispneia","Convulsões","Icterícia","Distensão abdominal","Prurido","Alopécia","Polifagia","Ataxia","Hematúria","Epistaxe","Claudicação","Febre","Ascite"];
const SPECIES_LIST = ["Canídeo","Felídeo","Equídeo","Bovídeo","Ovídeo","Aves","Réptil","Lagomorfo"];
const BLOOD_P = {
  hem:[{key:"ht",label:"Hematócrito (%)"},{key:"hgb",label:"Hemoglobina (g/dL)"},{key:"rbc",label:"Eritrócitos (×10⁶/µL)"},{key:"wbc",label:"Leucócitos (×10³/µL)"},{key:"neut",label:"Neutrófilos (%)"},{key:"lymph",label:"Linfócitos (%)"},{key:"plt",label:"Plaquetas (×10³/µL)"}],
  bio:[{key:"alb",label:"Albumina (g/dL)"},{key:"alt",label:"ALT (U/L)"},{key:"ast",label:"AST (U/L)"},{key:"alp",label:"FA/ALP (U/L)"},{key:"bun",label:"BUN/Ureia (mg/dL)"},{key:"crea",label:"Creatinina (mg/dL)"},{key:"glu",label:"Glucose (mg/dL)"},{key:"tbil",label:"Bilirrubina (mg/dL)"},{key:"tp",label:"Proteínas Totais (g/dL)"},{key:"ca",label:"Cálcio (mg/dL)"},{key:"na",label:"Sódio (mEq/L)"},{key:"k",label:"Potássio (mEq/L)"}],
  hor:[{key:"t4",label:"T4 Total (µg/dL)"},{key:"tsh",label:"TSH (mU/L)"},{key:"cortisol",label:"Cortisol (µg/dL)"},{key:"insulin",label:"Insulina (µU/mL)"}],
};
const URINE_P=[{key:"u_color",label:"Cor",type:"select",options:["Normal","Pálida","Escura","Avermelhada","Turva"]},{key:"u_density",label:"Densidade",placeholder:"ex: 1.025"},{key:"u_ph",label:"pH",placeholder:"ex: 6.5"},{key:"u_prot",label:"Proteína",type:"select",options:["Negativo","Traços","+","++","+++"]},{key:"u_glu",label:"Glucose",type:"select",options:["Negativo","+","++","+++"]},{key:"u_blood",label:"Sangue",type:"select",options:["Negativo","+","++","+++"]},{key:"u_sed_rbc",label:"Eritrócitos/campo",placeholder:"ex: 0-5"},{key:"u_upcratio",label:"Rácio UP/UC",placeholder:"ex: 0.3"}];
const FECES_P=[{key:"f_consist",label:"Consistência",type:"select",options:["Normal","Mole","Diarreia aquosa","Mucosa","Sanguinolenta"]},{key:"f_color",label:"Cor",type:"select",options:["Normal","Preta/melénica","Vermelha","Amarelada"]},{key:"f_blood",label:"Sangue oculto",type:"select",options:["Negativo","Positivo"]},{key:"f_parasites",label:"Parasitas/Ovos",type:"select",options:["Ausentes","Presentes"]},{key:"f_parasite_detail",label:"Parasitas identificados",placeholder:"ex: Toxocara, Giardia…"},{key:"f_pli",label:"cPLI/fPLI",type:"select",options:["Não realizado","Normal","Equívoco","Elevado"]}];
const VIDEO_ADS = [
  {id:1,brand:"IDEXX Laboratories",tag:"Laboratório",color:"#0D7377",icon:"🧬",cta:"Saber mais",thumb:"🔬",duration:"0:30",title:"Novo painel SDMA — diagnóstico renal precoce",desc:"Detecte doença renal antes dos sinais clínicos.",views:"14.2k",url:"https://www.idexx.com/pt-pt/veterinary/"},
  {id:2,brand:"Royal Canin Pro",tag:"Nutrição",color:"#E8A838",icon:"🐾",cta:"Ver dietas",thumb:"🐶",duration:"0:45",title:"Dieta Renal — reformulação 2024",desc:"Nova fórmula com Omega-3 EPA+DHA aumentado.",views:"9.8k",url:"https://www.royalcanin.com/pt/veterinary"},
];

// ── Anúncios de Formação Profissional ─────────────────────────────────────────
const LEARN_ADS = [
  {
    id:1, brand:"Hill's Vet Academy", tag:"Formação Patrocinada", color:"#E05C6A",
    icon:"🎓", badge:"NOVO", cta:"Inscrever grátis", url:"https://www.hillsvet.com",
    title:"Certificação em Nutrição Clínica Veterinária",
    desc:"Programa online de 12h com avaliação e certificado reconhecido. Acesso gratuito para membros VetConnect.",
    features:["12h conteúdo online","Certificado internacional","CPD: 12 pontos","Acesso vitalício"],
  },
  {
    id:2, brand:"Zoetis Petcare Academy", tag:"Webinar Gratuito", color:"#6C3FC7",
    icon:"📡", badge:"GRATUITO", cta:"Reservar lugar", url:"https://www.zoetis.pt",
    title:"Oncologia Veterinária — Casos Práticos 2024",
    desc:"Webinar ao vivo com especialistas. Apresentação de casos clínicos reais e discussão de protocolos modernos.",
    features:["Ao vivo + gravação","Q&A com especialistas","CPD: 4 pontos","Vagas limitadas"],
  },
  {
    id:3, brand:"ECVIM-CA", tag:"Congresso", color:"#0D7377",
    icon:"🏛️", badge:"DESTAQUE", cta:"Saber mais", url:"https://www.ecvim-ca.org",
    title:"Congresso Europeu de Medicina Interna 2024",
    desc:"O maior evento de medicina interna veterinária da Europa. Lisboa, Setembro 2024. Registo antecipado disponível.",
    features:["3 dias de programa","200+ palestrantes","CPD: 24 pontos","Early bird -30%"],
  },
];
// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN — entrada directa para utilizadores registados
// ══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onRegister, C, t, dark, setDark, lang, setLang }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const currentLang = LANGS.find(l=>l.code===lang)||LANGS[0];

  const login = async () => {
    setError("");
    if(!email.trim()||!password.trim()){ setError("Por favor preencha o email e a password."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if(err) setError(err.message === "Invalid login credentials" ? "Email ou password incorrectos." : err.message);
    // On success, the onAuthStateChange listener in VetConnect() picks up the new session.
  };

  const loginWithGoogle = async () => {
    setError("");
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if(err) setError(err.message);
  };

  const handleKey = e => { if(e.key==="Enter") login(); };

  const forgotPassword = async () => {
    if(!email.trim()){ setError("Introduza o seu email para recuperar a password."); return; }
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    if(err) setError(err.message);
    else setForgotSent(true);
  };

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,flexDirection:"column",gap:0}}>
      {/* Lang + Dark toggles top-right */}
      <div style={{position:"absolute",top:16,right:16,display:"flex",gap:8}}>
        <select value={lang} onChange={e=>setLang(e.target.value)}
          style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:12,color:C.text,cursor:"pointer",outline:"none"}}>
          {LANGS.map(l=><option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
        </select>
        <button onClick={()=>setDark(d=>!d)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center"}}>
          <Icon d={dark?ic.sun:ic.moon} size={16} color={C.sub}/>
        </button>
      </div>

      <div style={{width:"100%",maxWidth:420,background:C.surface,borderRadius:20,boxShadow:"0 8px 40px rgba(0,0,0,0.15)",overflow:"hidden",border:`1px solid ${C.border}`}}>
        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${C.teal},${C.tealL})`,padding:"32px 32px 28px",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:10}}>🐾</div>
          <div style={{color:"#fff",fontWeight:900,fontSize:22,letterSpacing:"-0.5px",marginBottom:4}}>VetConnect</div>
          <div style={{color:"rgba(255,255,255,0.8)",fontSize:13}}>A rede global dos médicos veterinários</div>
          <div style={{marginTop:10,background:"rgba(255,255,255,0.15)",borderRadius:20,padding:"4px 14px",display:"inline-block",fontSize:11,fontWeight:700,color:"#fff",letterSpacing:0.5}}>🚀 BETA v{APP_VERSION}</div>
        </div>

        {/* Form */}
        <div style={{padding:"28px 32px 32px"}}>
          <div style={{fontWeight:800,fontSize:18,color:C.text,marginBottom:22}}>Entrar na sua conta</div>

          {forgotSent?(
            <div style={{background:C.mint,border:`1.5px solid ${C.teal}`,borderRadius:10,padding:"14px 16px",marginBottom:20,textAlign:"center"}}>
              <div style={{fontSize:24,marginBottom:6}}>📧</div>
              <div style={{fontWeight:700,fontSize:13,color:C.teal,marginBottom:4}}>Email enviado!</div>
              <div style={{fontSize:12,color:C.sub}}>Verifique a sua caixa de entrada para redefinir a password.</div>
              <button onClick={()=>setForgotSent(false)} style={{marginTop:10,background:"none",border:"none",cursor:"pointer",color:C.teal,fontWeight:600,fontSize:12}}>← Voltar ao login</button>
            </div>
          ):(
            <>
              {/* Email */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:6}}>EMAIL PROFISSIONAL</label>
                <input
                  type="email"
                  value={email}
                  onChange={e=>{setEmail(e.target.value);setError("");}}
                  onKeyDown={handleKey}
                  placeholder="exemplo@clinica.pt"
                  autoComplete="email"
                  style={{...inp(C),fontSize:14}}
                />
              </div>

              {/* Password */}
              <div style={{marginBottom:8}}>
                <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:6}}>PASSWORD</label>
                <div style={{position:"relative"}}>
                  <input
                    type={showPw?"text":"password"}
                    value={password}
                    onChange={e=>{setPassword(e.target.value);setError("");}}
                    onKeyDown={handleKey}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{...inp(C),fontSize:14,paddingRight:44}}
                  />
                  <button onClick={()=>setShowPw(p=>!p)}
                    style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.sub,padding:4}}
                    aria-label={showPw?"Ocultar password":"Mostrar password"}>
                    {showPw?"🙈":"👁"}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div style={{textAlign:"right",marginBottom:18}}>
                <button onClick={forgotPassword} style={{background:"none",border:"none",cursor:"pointer",color:C.teal,fontSize:12,fontWeight:600}}>Esqueceu a password?</button>
              </div>

              {/* Error */}
              {error&&(
                <div style={{background:C.rose+"15",border:`1px solid ${C.rose}40`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:C.rose,display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              {/* Login button */}
              <button onClick={login} disabled={loading}
                style={{...btn(C,"primary"),width:"100%",justifyContent:"center",padding:"13px 20px",fontSize:15,borderRadius:10,opacity:loading?0.75:1,marginBottom:16}}>
                {loading?t("login_creating"):t("login_enter")+" →"}
              </button>

              {/* Divider */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{flex:1,height:1,background:C.border}}/>
                <span style={{fontSize:12,color:C.sub,whiteSpace:"nowrap"}}>ou</span>
                <div style={{flex:1,height:1,background:C.border}}/>
              </div>

              {/* Social login */}
              <div style={{display:"flex",gap:10,marginBottom:24}}>
                <button onClick={loginWithGoogle}
                  style={{flex:1,background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:9,padding:"9px 8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:C.text,fontWeight:600,transition:"border .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#4285F4"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  <span>🔵</span>Google
                </button>
              </div>
            </>
          )}

          {/* Register link */}
          <div style={{textAlign:"center",borderTop:`1px solid ${C.border}`,paddingTop:18}}>
            <span style={{fontSize:13,color:C.sub}}>Ainda não tem conta? </span>
            <button onClick={onRegister} style={{background:"none",border:"none",cursor:"pointer",color:C.teal,fontWeight:700,fontSize:13}}>Criar conta gratuita →</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{marginTop:20,fontSize:11,color:C.sub,textAlign:"center"}}>
        {APP_NAME} v{APP_VERSION} · © 2024 · <span style={{color:C.teal,cursor:"pointer"}} onClick={()=>window.open("mailto:beta@vetconnect.pt","_blank")}>beta@vetconnect.pt</span>
      </div>
    </div>
  );
}

function Onboarding({ onBack, C, t }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [spec, setSpec] = useState(""); const [country, setCountry] = useState(""); const [license, setLicense] = useState("");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signedUp, setSignedUp] = useState(false);
  const toggleInt = s => setInterests(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);

  const finishSignup = async () => {
    setError("");
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim(), specialty: spec, country, license, interests } },
    });
    setLoading(false);
    if(err) { setError(err.message); return; }
    // If email confirmation is required, Supabase returns a user but no session yet.
    if(!data.session) setSignedUp(true);
    // Otherwise onAuthStateChange in VetConnect() picks up the new session automatically.
  };

  if(signedUp) return (
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:420,background:C.surface,borderRadius:20,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",padding:"36px 28px",textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:14}}>📧</div>
        <div style={{fontWeight:800,fontSize:18,color:C.text,marginBottom:8}}>Confirme o seu email</div>
        <div style={{fontSize:13,color:C.sub,lineHeight:1.6,marginBottom:20}}>Enviámos um link de confirmação para <strong>{email}</strong>. Abra-o para activar a sua conta e iniciar sessão.</div>
        <button onClick={onBack} style={{...btn(C,"primary")}}>← Voltar ao login</button>
      </div>
    </div>
  );

  const steps = [
    <div key={0} style={{textAlign:"center",padding:"40px 24px"}}>
      <div style={{fontSize:68,marginBottom:16}}>🐾</div>
      <div style={{fontWeight:900,fontSize:26,color:C.teal,marginBottom:8}}>{t("onb_welcome")}</div>
      <div style={{color:C.sub,fontSize:14,lineHeight:1.7,marginBottom:28}}>{t("onb_sub")}</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:300,margin:"0 auto 28px"}}>
        {[["🧠 Diagnóstico IA","Diagnóstico diferencial com inteligência artificial"],["📡 Live Streaming","Congressos e palestras em tempo real"],["🌍 12 Idiomas","Rede global de veterinários"],["🛒 "+t("marketplace"),"Equipamentos, emprego e formação"]].map(([e,d])=>(
          <div key={e} style={{display:"flex",alignItems:"center",gap:12,background:C.bg,borderRadius:10,padding:"10px 14px",textAlign:"left"}}>
            <span style={{fontSize:20}}>{e.split(" ")[0]}</span>
            <div><div style={{fontWeight:700,fontSize:12,color:C.text}}>{e.slice(2)}</div><div style={{fontSize:11,color:C.sub}}>{d}</div></div>
          </div>
        ))}
      </div>
      <button onClick={()=>setStep(1)} style={{...btn(C,"primary"),padding:"13px 40px",fontSize:15,borderRadius:12}}>{t("onb_start")} →</button>
      {onBack&&<div style={{marginTop:16,fontSize:13,color:C.sub}}>Já tem conta? <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:C.teal,fontWeight:700,fontSize:13}}>Entrar →</button></div>}
    </div>,

    <div key={1} style={{padding:"28px 24px"}}>
      <div style={{fontWeight:800,fontSize:20,color:C.text,marginBottom:4}}>👤 Perfil profissional</div>
      <div style={{color:C.sub,fontSize:12,marginBottom:22}}>Passo 1 de 3 — Conta e identidade</div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>NOME COMPLETO</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="ex: Dra. Ana Ferreira" style={inp(C)}/></div>
        <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>EMAIL PROFISSIONAL</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="exemplo@clinica.pt" autoComplete="email" style={inp(C)}/></div>
        <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>PASSWORD</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="mínimo 6 caracteres" autoComplete="new-password" style={inp(C)}/></div>
        <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>{t("onb_spec").toUpperCase()}</label>
          <select value={spec} onChange={e=>setSpec(e.target.value)} style={inp(C)}><option value="">Seleccionar…</option>{SPECIALTIES.map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>{t("onb_country").toUpperCase()}</label>
          <select value={country} onChange={e=>setCountry(e.target.value)} style={inp(C)}><option value="">Seleccionar…</option>{["Portugal","Brasil","Espanha","França","Angola","Moçambique","Outro"].map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>{t("onb_license").toUpperCase()}</label>
          <input value={license} onChange={e=>setLicense(e.target.value)} placeholder="ex: OMV-12345 / CRMV-SP-44321" style={inp(C)}/></div>
        <div style={{background:C.mint,borderRadius:10,padding:"10px 14px",display:"flex",gap:10}}>
          <span style={{fontSize:18}}>🔒</span>
          <span style={{fontSize:12,color:C.teal,lineHeight:1.5}}>O número de cédula é verificado internamente e garante que apenas veterinários licenciados acedem.</span>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:22}}>
        <button onClick={()=>setStep(0)} style={{...btn(C,"outline"),flex:1}}>← Voltar</button>
        <button onClick={()=>setStep(2)} disabled={!name.trim()||!email.trim()||password.length<6||!spec||!country} style={{...btn(C,"primary"),flex:1,opacity:(!name.trim()||!email.trim()||password.length<6||!spec||!country)?0.5:1}}>Continuar →</button>
      </div>
    </div>,

    <div key={2} style={{padding:"28px 24px"}}>
      <div style={{fontWeight:800,fontSize:20,color:C.text,marginBottom:4}}>🎯 Áreas de interesse</div>
      <div style={{color:C.sub,fontSize:12,marginBottom:18}}>Passo 2 de 3 — Seleccione pelo menos 3 áreas</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:22}}>
        {SPECIALTIES.map(s=>(
          <button key={s} onClick={()=>toggleInt(s)} style={{padding:"7px 14px",borderRadius:20,border:interests.includes(s)?`2px solid ${C.teal}`:`2px solid ${C.border}`,background:interests.includes(s)?C.mint:C.surface,color:interests.includes(s)?C.teal:C.sub,fontWeight:interests.includes(s)?700:400,cursor:"pointer",fontSize:12,transition:"all .15s"}}>{s}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setStep(1)} style={{...btn(C,"outline"),flex:1}}>← Voltar</button>
        <button onClick={()=>setStep(3)} disabled={interests.length<3} style={{...btn(C,"primary"),flex:1,opacity:interests.length<3?0.5:1}}>Continuar ({interests.length}/3+) →</button>
      </div>
    </div>,

    <div key={3} style={{padding:"28px 24px"}}>
      <div style={{fontWeight:800,fontSize:20,color:C.text,marginBottom:4}}>🎉 Tudo pronto!</div>
      <div style={{color:C.sub,fontSize:12,marginBottom:18}}>Passo 3 de 3 — Reveja e confirme a sua conta</div>
      <div style={{...card(C),marginBottom:22}}>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>{name||"—"}</div>
        <div style={{fontSize:12,color:C.sub,marginBottom:10}}>{spec}{country?` · ${country}`:""}{license?` · ${license}`:""}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {interests.map(i=><span key={i} style={tag(C.teal)}>{i}</span>)}
        </div>
      </div>
      {error&&(
        <div style={{background:C.rose+"15",border:`1px solid ${C.rose}40`,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.rose}}>⚠️ {error}</div>
      )}
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setStep(2)} style={{...btn(C,"outline"),flex:1}}>← Voltar</button>
        <button onClick={finishSignup} disabled={loading} style={{...btn(C,"primary"),flex:1,opacity:loading?0.75:1}}>{loading?"A criar conta…":`🎉 ${t("onb_finish")}`}</button>
      </div>
    </div>
  ];

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",overflowY:"auto",padding:16}}>
      <div style={{width:"100%",maxWidth:460,background:C.surface,borderRadius:20,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",overflow:"hidden"}}>
        <div style={{height:4,background:C.border}}><div style={{height:"100%",background:C.teal,width:`${(step/3)*100}%`,transition:"width .4s",borderRadius:4}}/></div>
        {steps[step]}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEARCH HUB
// ══════════════════════════════════════════════════════════════════════════════
function SearchSection({title,color,icon,children}){
  return <div><div style={{padding:"8px 20px",background:`${color}12`,fontSize:11,fontWeight:700,color,display:"flex",alignItems:"center",gap:6}}><span>{icon}</span>{title}</div>{children}</div>;
}
function SearchHub({ query, onClose, C, t, setMainTab }) {
  const q = query.toLowerCase();
  const [vets, setVets] = useState([]);
  const [cases, setCases] = useState([]);

  useEffect(() => {
    if(!q.trim()){ setVets([]); setCases([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, country")
        .or(`full_name.ilike.%${q}%,specialty.ilike.%${q}%`)
        .limit(10);
      if(cancelled) return;
      if(error){ console.error(error); setVets([]); }
      else setVets((data||[]).map(p => ({
        id: p.id,
        name: p.full_name || "Utilizador",
        avatar: initialsOf(p.full_name),
        spec: p.specialty || "",
        country: p.country || "",
        online: false,
        verified: false,
      })));

      const { data: caseData, error: caseErr } = await supabase
        .from("soap_cases")
        .select("id, title, species, age, status")
        .or(`title.ilike.%${q}%,subjective.ilike.%${q}%`)
        .limit(10);
      if(cancelled) return;
      if(caseErr){ console.error(caseErr); setCases([]); }
      else setCases(caseData||[]);
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q]);

  if(!q) return null;
  const courses=COURSES.filter(c=>c.title.toLowerCase().includes(q));
  const items=MARKET_ITEMS.filter(i=>i.title.toLowerCase().includes(q));
  const total=vets.length+cases.length+courses.length+items.length;
  return (
    <div style={{position:"fixed",inset:0,zIndex:350,background:"rgba(0,0,0,0.4)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:62,left:"50%",transform:"translateX(-50%)",width:"min(90vw,600px)",background:C.surface,borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,0.2)",maxHeight:"72vh",overflowY:"auto"}}>
        <div style={{padding:"12px 20px 10px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:14,color:C.text}}>
          {total>0?`${total} resultados para "${query}"`:`${t("search_empty")} "${query}"`}
        </div>
        {vets.length>0&&<SearchSection title={`${t("results_vets")} (${vets.length})`} color={C.teal} icon="👥">
          {vets.map(u=><div key={u.id} onClick={async ()=>{
              const { error } = await supabase.rpc("get_or_create_dm", { other_user_id: u.id });
              if(error) console.error(error);
              setMainTab("community"); onClose();
            }} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 20px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
            <div style={ava(C,34,u.online)}>{u.avatar}</div>
            <div><div style={{fontWeight:600,fontSize:13,color:C.text}}>{u.name}{u.verified&&" ✅"}</div><div style={{fontSize:11,color:C.sub}}>{u.spec} · {u.country}</div></div>
          </div>)}
        </SearchSection>}
        {cases.length>0&&<SearchSection title={`${t("results_cases")} (${cases.length})`} color={C.purple} icon="🔬">
          {cases.map(c=><div key={c.id} onClick={()=>{setMainTab("clinic");onClose();}} style={{padding:"10px 20px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontWeight:600,fontSize:13,color:C.text}}>{c.title}</div>
            <div style={{fontSize:11,color:C.sub}}>{c.species} · {c.age} · {c.status}</div>
          </div>)}
        </SearchSection>}
        {courses.length>0&&<SearchSection title={`${t("results_training")} (${courses.length})`} color={C.amber} icon="📚">
          {courses.map(c=><div key={c.id} onClick={()=>{setMainTab("learn");onClose();}} style={{display:"flex",gap:10,padding:"10px 20px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:20}}>{c.icon}</span>
            <div><div style={{fontWeight:600,fontSize:13,color:C.text}}>{c.title}</div><div style={{fontSize:11,color:C.sub}}>{c.type} · {c.price}</div></div>
          </div>)}
        </SearchSection>}
        {items.length>0&&<SearchSection title={`${t("results_market")} (${items.length})`} color={C.emerald} icon="🛒">
          {items.map(i=><div key={i.id} onClick={()=>{setMainTab("market");onClose();}} style={{display:"flex",gap:10,padding:"10px 20px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:20}}>{i.img}</span>
            <div><div style={{fontWeight:600,fontSize:13,color:C.text}}>{i.title}</div><div style={{fontSize:11,color:C.sub}}>{i.cat} · {i.price}</div></div>
          </div>)}
        </SearchSection>}
        {total===0&&<div style={{padding:"28px 20px",textAlign:"center",color:C.sub,fontSize:13}}>Tente pesquisar por especialidade, espécie ou tema clínico.</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════
function NotifPanel({ onClose, C, t, isMobile, notifs, setNotifs, setMainTab, meId }) {
  const [filter, setFilter] = useState("all");
  const markRead = id => {
    setNotifs(ns=>ns.map(x=>x.id===id?{...x,read:true}:x));
    supabase.from("notifications").update({ read:true }).eq("id", id).then(({error})=>{ if(error) console.error(error); });
  };
  const markAll = () => {
    setNotifs(n=>n.map(x=>({...x,read:true})));
    supabase.from("notifications").update({ read:true }).eq("recipient_id", meId).eq("read", false).then(({error})=>{ if(error) console.error(error); });
  };
  const dismiss = id => {
    setNotifs(n=>n.filter(x=>x.id!==id));
    supabase.from("notifications").delete().eq("id", id).then(({error})=>{ if(error) console.error(error); });
  };
  const unread = notifs.filter(n=>!n.read).length;
  const filtered = filter==="unread"?notifs.filter(n=>!n.read):notifs;
  const notifIcons = {like:"❤️",comment:"💬",case_comment:"🩺",msg:"✉️"};

  const TAB_MAP = {
    like:"home", comment:"home", case_comment:"clinic",
    msg:"community",
  };

  const handleClick = (n) => {
    markRead(n.id);
    const dest = TAB_MAP[n.type];
    if(dest) {
      setMainTab(dest); // setMainTab here is changeTab passed from VetConnect
      onClose();
    }
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",justifyContent:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:isMobile?"100%":380,background:C.surface,boxShadow:"-4px 0 24px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",height:"100%",borderLeft:`1px solid ${C.border}`}}>
        <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontWeight:800,fontSize:16,color:C.text}}>🔔 {t("notifications")}</span>
              {unread>0&&<span style={{background:C.rose,color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{unread}</span>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {unread>0&&<button onClick={markAll} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.teal,fontWeight:600}}>{t("mark_all")}</button>}
              <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}} aria-label={t("close")}><Icon d={ic.x} size={18} color={C.sub}/></button>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            {[["all","Todas"],["unread","Não lidas"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{padding:"5px 12px",borderRadius:18,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:filter===v?C.teal:C.bg,color:filter===v?"#fff":C.sub}}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {filtered.map(n=>(
            <div key={n.id} onClick={()=>handleClick(n)}
              style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 18px",borderBottom:`1px solid ${C.border}`,background:n.read?C.surface:C.mint+"40",cursor:TAB_MAP[n.type]?"pointer":"default",transition:"background .12s"}}
              onMouseEnter={e=>{if(TAB_MAP[n.type])e.currentTarget.style.background=C.bg;}}
              onMouseLeave={e=>{e.currentTarget.style.background=n.read?C.surface:C.mint+"40";}}>
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${n.color},${n.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:12}}>{n.avatar}</div>
                <div style={{position:"absolute",bottom:-2,right:-2,fontSize:13}}>{notifIcons[n.type]||"🔔"}</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,lineHeight:1.5,color:C.text}}><span style={{fontWeight:700}}>{n.user}</span> <span style={{color:C.sub}}>{n.action}</span></div>
                {n.target&&<div style={{fontSize:11,color:C.sub,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.target}</div>}
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                  <span style={{fontSize:10,color:C.sub}}>{n.time}</span>
                  {TAB_MAP[n.type]&&<span style={{fontSize:10,color:C.teal,fontWeight:600}}>→ {({home:"Feed",community:"Mensagens",learn:"Formação",market:"Mercado",clinic:"Clínica"})[TAB_MAP[n.type]]}</span>}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0}}>
                {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:C.teal}}/>}
                <button onClick={e=>{e.stopPropagation();dismiss(n.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.sub}} aria-label="Dispensar">✕</button>
              </div>
            </div>
          ))}
          {filtered.length===0&&<div style={{padding:40,textAlign:"center",color:C.sub}}><div style={{fontSize:32,marginBottom:10}}>🔔</div><div>Sem notificações</div></div>}
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
          {typeof Notification!=="undefined"&&Notification.permission==="default"&&(
            <button onClick={()=>Notification.requestPermission()}
              style={{width:"100%",background:C.mint,border:`1px solid ${C.teal}40`,borderRadius:9,padding:"10px 14px",fontSize:12,cursor:"pointer",color:C.teal,fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
              🔔 Activar notificações do browser
            </button>
          )}
          <button onClick={()=>{onClose();}} style={{width:"100%",background:C.bg,border:"none",borderRadius:9,padding:10,fontSize:12,cursor:"pointer",color:C.sub,fontWeight:600}}>{"⚙️ "+t("notif_settings")}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LANG PICKER
// ══════════════════════════════════════════════════════════════════════════════
function LangPicker({ onClose, lang, setLang, C, t }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:360,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px 14px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontWeight:800,fontSize:16,color:C.text}}>🌐 {t("language")}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}} aria-label={t("close")}><Icon d={ic.x} size={18} color={C.sub}/></button>
        </div>
        {LANGS.map(l=>(
          <div key={l.code} onClick={()=>{setLang(l.code);onClose();}}
            style={{display:"flex",alignItems:"center",gap:14,padding:"12px 20px",cursor:"pointer",background:lang===l.code?C.mint:"transparent",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:22}}>{l.flag}</span>
            <span style={{flex:1,fontSize:14,fontWeight:lang===l.code?700:400,color:lang===l.code?C.teal:C.text}}>{l.label}</span>
            {lang===l.code&&<Icon d={ic.check} size={16} color={C.teal}/>}
          </div>
        ))}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// VIDEO AD CARD
// ══════════════════════════════════════════════════════════════════════════════
function VideoAdCard({ ad, C, compact=false }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(()=>{ if(!playing)return; const iv=setInterval(()=>setProgress(p=>{if(p>=100){setPlaying(false);return 100;}return p+2;}),300); return ()=>clearInterval(iv); },[playing]);
  if(dismissed) return null;
  if(compact) return (
    <div style={{background:`linear-gradient(135deg,${ad.color}15,${ad.color}05)`,border:`1.5px solid ${ad.color}28`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div onClick={()=>setPlaying(!playing)} style={{width:52,height:52,borderRadius:10,background:ad.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,cursor:"pointer",position:"relative"}}>
          {ad.thumb}
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.28)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:14,color:"#fff"}}>{playing?"⏸":"▶"}</span></div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontWeight:700,fontSize:12,color:ad.color}}>{ad.brand}</span>
            <span style={{fontSize:9,background:ad.color+"18",color:ad.color,borderRadius:4,padding:"1px 5px",fontWeight:700}}>Patrocinado</span>
          </div>
          <div style={{fontSize:12,fontWeight:600,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text}}>{ad.title}</div>
          <div style={{fontSize:10,color:C.sub}}>🎬 {ad.duration} · 👁 {ad.views}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0,alignItems:"flex-end"}}>
          <button onClick={()=>setDismissed(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.sub,lineHeight:1}} aria-label="Fechar anúncio">✕</button>
          <button onClick={()=>window.open(ad.url||"https://vetconnect.pt","_blank")} style={{background:ad.color,color:"#fff",border:"none",borderRadius:7,padding:"5px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>{ad.cta}</button>
        </div>
      </div>
      {playing&&<div style={{marginTop:8}}><div style={{height:3,background:C.border,borderRadius:3}}><div style={{width:`${progress}%`,height:"100%",background:ad.color,borderRadius:3,transition:"width .3s"}}/></div></div>}
    </div>
  );
  return (
    <div style={{...card(C,{marginBottom:14}),border:`1.5px solid ${ad.color}22`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{width:28,height:28,borderRadius:8,background:ad.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{ad.icon}</div>
        <span style={{fontWeight:700,fontSize:13,color:ad.color,flex:1}}>{ad.brand}</span>
        <span style={{fontSize:9,background:ad.color+"15",color:ad.color,borderRadius:4,padding:"1px 6px",fontWeight:700}}>📢 Patrocinado</span>
        <button onClick={()=>setDismissed(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.sub}} aria-label="Fechar anúncio">✕</button>
      </div>
      <div onClick={()=>setPlaying(!playing)} style={{height:180,background:`linear-gradient(135deg,#0F1923,${ad.color}55,#0F1923)`,borderRadius:10,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",overflow:"hidden"}}>
        <span style={{fontSize:64}}>{ad.thumb}</span>
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,0.92)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{playing?"⏸":"▶️"}</div>
        </div>
        {playing&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.55)",padding:"6px 12px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,height:3,background:"rgba(255,255,255,0.3)",borderRadius:3}}><div style={{width:`${progress}%`,height:"100%",background:"#fff",borderRadius:3,transition:"width .3s"}}/></div>
          <button onClick={e=>{e.stopPropagation();setMuted(m=>!m);}} aria-label={muted?"Activar som":"Silenciar"} style={{background:"none",border:"none",cursor:"pointer",color:"#fff",fontSize:14}}>{muted?"🔇":"🔊"}</button>
        </div>}
        <div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.5)",color:"#fff",borderRadius:5,padding:"2px 7px",fontSize:10}}>👁 {ad.views}</div>
      </div>
      <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>{ad.title}</div>
      <div style={{fontSize:12,color:C.sub,lineHeight:1.5,marginBottom:12}}>{ad.desc}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={tag(ad.color)}>{ad.tag}</span>
        <button onClick={()=>window.open(ad.url||"https://vetconnect.pt","_blank")} style={{background:ad.color,color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{ad.cta} →</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME FEED
// ══════════════════════════════════════════════════════════════════════════════
const mapPostRow = (row, me) => ({
  id: row.id,
  user: {
    id: row.author_id,
    name: row.profiles?.full_name || "Utilizador",
    avatar: initialsOf(row.profiles?.full_name),
    spec: row.profiles?.specialty || "",
    online: true,
  },
  time: timeAgo(row.created_at),
  type: row.type,
  content: row.content,
  likes: row.likes_count || 0,
  comments: row.comments_count || 0,
  tags: row.tags || [],
  attachments: (row.post_attachments || []).map(a => ({ type: a.type, name: a.name, url: a.url })),
  soap: row.soap,
  likedByMe: (row.post_likes || []).some(l => l.user_id === me.id),
});

function Home({ C, t, isMobile, setMainTab, me }) {
  const [text, setText] = useState("");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [liked, setLiked] = useState([]);
  const [postAttachments, setPostAttachments] = useState([]);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [soapData, setSoapData] = useState({title:"",meta:"",S:"",O:"",A:"",P:""});
  const [shareFeedback, setShareFeedback] = useState(null);
  const [visibleCount, setVisibleCount] = useState(2);
  const [following, setFollowing] = useState([]);
  const [fbKey, triggerFb] = useFeedback();
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles:author_id(full_name,specialty), post_attachments(type,name,url), post_likes(user_id)")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) { console.error(error); setPostsLoading(false); return; }
    const mapped = (data || []).map(row => mapPostRow(row, me));
    setPosts(mapped);
    setLiked(mapped.filter(p => p.likedByMe).map(p => p.id));
    setPostsLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  const submitPost = async () => {
    if(!text.trim()&&postAttachments.length===0&&!soapData.title) return;
    const hasSoap = soapData.title&&(soapData.S||soapData.O||soapData.A||soapData.P);
    const content = text||(hasSoap?`**${soapData.title}**${soapData.meta?" — "+soapData.meta:""}`:postAttachments.map(a=>a.name).join(", "));
    setPosting(true);
    setPostError("");
    try {
      const { data: inserted, error: insErr } = await supabase.from("posts").insert({
        author_id: me.id,
        type: hasSoap?"clinical":"post",
        content,
        soap: hasSoap?soapData:null,
      }).select().single();
      if(insErr) throw insErr;

      const uploadedAttachments = [];
      for(const a of postAttachments){
        if(!a.file) continue;
        const path = `${me.id}/${Date.now()}-${a.file.name}`;
        const { error: upErr } = await supabase.storage.from("post-media").upload(path, a.file);
        if(upErr) throw upErr;
        const { data: pub } = supabase.storage.from("post-media").getPublicUrl(path);
        uploadedAttachments.push({ post_id: inserted.id, type: a.type, name: a.file.name, url: pub.publicUrl });
      }
      if(uploadedAttachments.length){
        const { error: attErr } = await supabase.from("post_attachments").insert(uploadedAttachments);
        if(attErr) throw attErr;
      }

      setPosts(prev => [mapPostRow({
        ...inserted,
        profiles: { full_name: me.name, specialty: me.spec },
        post_attachments: uploadedAttachments,
        post_likes: [],
      }, me), ...prev]);
      setText("");
      setPostAttachments([]);
      setSoapData({title:"",meta:"",S:"",O:"",A:"",P:""});
      setCaseModalOpen(false);
    } catch(err) {
      setPostError(err.message || "Erro ao publicar.");
    } finally {
      setPosting(false);
    }
  };

  const [openComments, setOpenComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [postComments, setPostComments] = useState({});

  const toggleComments = async (id) => {
    const opening = !openComments[id];
    setOpenComments(prev=>({...prev,[id]:opening}));
    if(opening && !postComments[id]){
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, text, created_at, profiles:author_id(full_name)")
        .eq("post_id", id)
        .order("created_at", { ascending: true });
      if(error){ console.error(error); return; }
      setPostComments(prev=>({...prev,[id]:(data||[]).map(c=>({
        id: c.id,
        user: { name: c.profiles?.full_name || "Utilizador", avatar: initialsOf(c.profiles?.full_name) },
        text: c.text,
        time: timeAgo(c.created_at),
      }))}));
    }
  };
  const submitComment = async (postId) => {
    const txt = (commentInputs[postId]||"").trim();
    if(!txt) return;
    setCommentInputs(prev=>({...prev,[postId]:""}));
    const { data, error } = await supabase.from("post_comments").insert({ post_id: postId, author_id: me.id, text: txt }).select().single();
    if(error){ console.error(error); return; }
    setPostComments(prev=>({...prev,[postId]:[...(prev[postId]||[]),{id:data.id,user:me,text:txt,time:"agora"}]}));
    setPosts(prev=>prev.map(p=>p.id===postId?{...p,comments:p.comments+1}:p));
  };
  const toggleLike = async (postId) => {
    const isLiked = liked.includes(postId);
    setLiked(l=>isLiked?l.filter(x=>x!==postId):[...l,postId]);
    setPosts(prev=>prev.map(p=>p.id===postId?{...p,likes:p.likes+(isLiked?-1:1)}:p));
    const { error } = isLiked
      ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", me.id)
      : await supabase.from("post_likes").insert({ post_id: postId, user_id: me.id });
    if(error) console.error(error);
  };
  const typeColor={clinical:C.teal,event:C.purple,post:C.slate};
  const typeLabel={clinical:"🔬 Caso Clínico",event:"📅 Evento",post:"📝 Post"};
  const liveNow=LIVE_EVENTS.find(e=>e.status==="live");
  return (
    <div style={{maxWidth:isMobile?"100%":680,margin:"0 auto"}}>
      {liveNow&&(
        <div style={{background:`linear-gradient(90deg,${C.rose},${C.rose}bb)`,borderRadius:12,padding:"12px 16px",color:"#fff",display:"flex",alignItems:"center",gap:12,marginBottom:14,cursor:"pointer"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#fff",boxShadow:"0 0 0 3px rgba(255,255,255,0.35)",flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:isMobile?12:13}}>AO VIVO · {liveNow.viewers.toLocaleString()} a assistir</div>
            <div style={{fontSize:isMobile?11:12,opacity:0.85,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{liveNow.title}</div>
          </div>
          <button onClick={()=>setMainTab("learn")} style={{background:"rgba(255,255,255,0.25)",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>▶ Entrar</button>
        </div>
      )}
      <div style={card(C)}>
        {/* Attachments preview strip */}
        {postAttachments.length>0&&(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {postAttachments.map((a,i)=>(
              <div key={i} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.text}}>
                <span>{a.type==="image"?"🖼️":a.type==="video"?"🎬":a.type==="doc"?"📄":"🔬"}</span>
                <span style={{maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</span>
                <button onClick={()=>setPostAttachments(prev=>prev.filter((_,j)=>j!==i))} aria-label={`Remover anexo ${a.name}`} style={{background:"none",border:"none",cursor:"pointer",color:C.sub,fontSize:14,lineHeight:1,padding:0}}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <div style={ava(C,isMobile?36:42,true)}>{me.avatar}</div>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={t("write_post")}
            style={{...inp(C),resize:"none",height:isMobile?60:76,flex:1,fontSize:isMobile?13:14}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {/* File buttons: label wraps input with opacity:0 overlay — works in sandbox */}
            {[
              {label:isMobile?"📷":"📷 Foto", accept:"image/*", multi:true,
                cb:files=>files.forEach(f=>setPostAttachments(p=>[...p,{type:"image",name:f.name,url:URL.createObjectURL(f),file:f}]))},
              {label:isMobile?"📎":"📎 Ficheiro", accept:".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip", multi:true,
                cb:files=>files.forEach(f=>setPostAttachments(p=>[...p,{type:"doc",name:f.name,file:f}]))},
              {label:isMobile?"🎬":"🎬 Vídeo", accept:"video/*", multi:false,
                cb:files=>{const f=files[0];if(f)setPostAttachments(p=>[...p,{type:"video",name:f.name,url:URL.createObjectURL(f),file:f}])}},
            ].map((item,i)=>(
              <label key={i} style={{
                position:"relative",display:"inline-flex",alignItems:"center",
                background:"none",border:`1px solid ${C.border}`,borderRadius:7,
                padding:isMobile?"5px 8px":"5px 10px",
                fontSize:isMobile?14:11,cursor:"pointer",color:C.sub,userSelect:"none",
                WebkitUserSelect:"none",overflow:"hidden"
              }}>
                {item.label}
                <input type="file" accept={item.accept} multiple={item.multi}
                  style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",fontSize:0,zIndex:2}}
                  onChange={e=>{const f=Array.from(e.target.files||[]);if(f.length)item.cb(f);e.target.value="";}}
                />
              </label>
            ))}
            {/* 🔬 Caso Clínico */}
            <button onClick={()=>setCaseModalOpen(true)}
              style={{background:caseModalOpen?C.mint:"none",border:`1px solid ${caseModalOpen?C.teal:C.border}`,borderRadius:7,padding:isMobile?"5px 8px":"5px 10px",fontSize:isMobile?14:11,cursor:"pointer",color:caseModalOpen?C.teal:C.sub}}>
              {isMobile?"🔬":"🔬 Caso"}
            </button>
          </div>
          <button onClick={submitPost} disabled={posting||(!text.trim()&&postAttachments.length===0&&!soapData.title)}
            style={{...btn(C,"primary",isMobile),opacity:(posting||(!text.trim()&&postAttachments.length===0&&!soapData.title))?0.5:1}}>
            {posting?"A publicar…":t("publish")}
          </button>
        </div>

        {postError&&(
          <div style={{marginTop:10,background:C.rose+"15",border:`1px solid ${C.rose}40`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.rose}}>⚠️ {postError}</div>
        )}

        {/* SOAP Case inline form */}
        {caseModalOpen&&(
          <div style={{marginTop:14,border:`1.5px solid ${C.teal}`,borderRadius:10,padding:14,background:C.mint}}>
            <div style={{fontWeight:700,fontSize:13,color:C.teal,marginBottom:12}}>🔬 Estrutura SOAP do Caso Clínico</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:10}}>
              <div><label style={{fontSize:10,fontWeight:700,color:C.sub,display:"block",marginBottom:4}}>ESPÉCIE / RAÇA / IDADE</label>
                <input value={soapData.meta} onChange={e=>setSoapData(p=>({...p,meta:e.target.value}))} placeholder="ex: Canídeo, Golden Retriever, 7 anos, Macho castrado" style={{...inp(C),fontSize:12}}/></div>
              <div><label style={{fontSize:10,fontWeight:700,color:C.sub,display:"block",marginBottom:4}}>TÍTULO DO CASO</label>
                <input value={soapData.title} onChange={e=>setSoapData(p=>({...p,title:e.target.value}))} placeholder="ex: PU/PD e nódulos adrenais" style={{...inp(C),fontSize:12}}/></div>
            </div>
            {[{key:"S",label:"S — Subjectivo",ph:"Queixas do proprietário, história clínica, sinais observados em casa…"},{key:"O",label:"O — Objectivo",ph:"Exame físico, parâmetros vitais, resultados analíticos…"},{key:"A",label:"A — Avaliação",ph:"Diagnósticos diferenciais, diagnóstico presuntivo…"},{key:"P",label:"P — Plano",ph:"Tratamento, exames complementares, follow-up…"}].map(({key,label,ph})=>(
              <div key={key} style={{marginBottom:8}}>
                <label style={{fontSize:10,fontWeight:700,color:C.teal,display:"block",marginBottom:4}}>{label}</label>
                <textarea value={soapData[key]} onChange={e=>setSoapData(p=>({...p,[key]:e.target.value}))} placeholder={ph} rows={2} style={{...inp(C),fontSize:12,resize:"vertical"}}/>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={()=>{setCaseModalOpen(false);setSoapData({title:"",meta:"",S:"",O:"",A:"",P:""});}} style={{...btn(C,"outline",true),fontSize:11}}>Cancelar</button>
              <button onClick={()=>setCaseModalOpen(false)} disabled={!soapData.title} style={{...btn(C,"primary",true),fontSize:11,opacity:!soapData.title?0.5:1}}>✓ Adicionar ao post</button>
            </div>
          </div>
        )}
      </div>
      <VideoAdCard ad={VIDEO_ADS[0]} C={C} compact/>
      {postsLoading&&<SkeletonFeed C={C}/>}
      {!postsLoading&&posts.length===0&&(
        <div style={{...card(C),textAlign:"center",color:C.sub,fontSize:13,padding:"28px 16px"}}>
          Ainda não há publicações. Sê o primeiro a partilhar um caso ou artigo! 📝
        </div>
      )}
      {posts.slice(0,visibleCount).map((p,idx)=>(
        <React.Fragment key={p.id}>
          <div style={{...card(C),border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12}}>
              <div style={ava(C,isMobile?36:42,p.user.online)}>{p.user.avatar}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text}}>{p.user.name}{p.user.verified&&" ✅"}</div>
                <div style={{fontSize:11,color:C.sub,marginBottom:p.type!=="post"?5:0}}>{p.user.spec} · {p.time}</div>
                {p.type!=="post"&&<span style={tag(typeColor[p.type]||C.sub)}>{typeLabel[p.type]||""}</span>}
              </div>
              <button onClick={()=>setFollowing(f=>f.includes(p.user.id)?f.filter(x=>x!==p.user.id):[...f,p.user.id])}
                style={{...btn(C,following.includes(p.user.id)?"primary":"outline",true),fontSize:11,flexShrink:0,marginTop:2}}>
                {following.includes(p.user.id)?"✓ A seguir":t("follow")}
              </button>
            </div>
            <div style={{fontSize:isMobile?13:14,lineHeight:1.65,color:C.text,marginBottom:12}}>{p.content}</div>

            {/* Attachments */}
            {p.attachments&&p.attachments.length>0&&(
              <div style={{marginBottom:12}}>
                {p.attachments.filter(a=>a.type==="image").length>0&&(
                  <div style={{display:"grid",gridTemplateColumns:p.attachments.filter(a=>a.type==="image").length>1?"1fr 1fr":"1fr",gap:6,marginBottom:8}}>
                    {p.attachments.filter(a=>a.type==="image").map((a,i)=>(
                      <div key={i} style={{height:isMobile?140:180,background:C.bg,borderRadius:10,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {a.url?<img src={a.url} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{fontSize:36}}>🖼️</div>}
                      </div>
                    ))}
                  </div>
                )}
                {p.attachments.filter(a=>a.type==="video").map((a,i)=>(
                  <div key={i} style={{borderRadius:10,overflow:"hidden",marginBottom:8,background:"#000"}}>
                    {a.url?<video src={a.url} controls playsInline style={{width:"100%",maxHeight:220,display:"block"}}/>
                      :<div style={{height:120,display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:C.sub,fontSize:13}}><span style={{fontSize:28}}>🎬</span>{a.name}</div>}
                  </div>
                ))}
                {p.attachments.filter(a=>a.type==="doc").map((a,i)=>(
                  <div key={i} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <span style={{fontSize:20}}>📄</span>
                    <span style={{fontSize:12,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</span>
                    <button onClick={()=>{if(a.url){const el=document.createElement("a");el.href=a.url;el.download=a.name;el.click();}else{navigator.clipboard?.writeText(a.name);}}} aria-label={`Descarregar ${a.name}`} style={{...btn(C,"outline",true),fontSize:10}}>⬇️</button>
                  </div>
                ))}
              </div>
            )}

            {/* SOAP Case structure */}
            {p.soap&&(
              <div style={{border:`1.5px solid ${C.teal}40`,borderRadius:10,overflow:"hidden",marginBottom:12}}>
                <div style={{background:C.teal,padding:"8px 14px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:"#fff",fontWeight:700,fontSize:12}}>🔬 {p.soap.title}</span>
                  {p.soap.meta&&<span style={{color:"rgba(255,255,255,0.75)",fontSize:11}}>· {p.soap.meta}</span>}
                </div>
                <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                  {[{key:"S",col:C.teal},{key:"O",col:C.purple},{key:"A",col:C.amber},{key:"P",col:C.emerald}].filter(({key})=>p.soap[key]).map(({key,col})=>(
                    <div key={key} style={{borderLeft:`3px solid ${col}`,paddingLeft:10}}>
                      <div style={{fontSize:10,fontWeight:800,color:col,marginBottom:3}}>{key} — {{S:"Subjectivo",O:"Objectivo",A:"Avaliação",P:"Plano"}[key]}</div>
                      <div style={{fontSize:12,color:C.text,lineHeight:1.5}}>{p.soap[key]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {p.tags.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>{p.tags.map(tg=><span key={tg} style={tag(C.teal)}>#{tg}</span>)}</div>}
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,display:"flex",gap:2}}>
              {[
                {emoji:"❤️",label:`${p.likes}`,act:()=>toggleLike(p.id),active:liked.includes(p.id),col:C.rose},
                {emoji:"💬",label:`${p.comments}`,act:()=>toggleComments(p.id),active:!!openComments[p.id],col:C.teal},
                {emoji:shareFeedback===p.id?"✅":"↗️",label:shareFeedback===p.id?"Copiado!":(isMobile?"":"Partilhar"),act:()=>{
                  if(navigator.clipboard) navigator.clipboard.writeText(`https://vetconnect.pt/post/${p.id}`);
                  setShareFeedback(p.id);
                  setTimeout(()=>setShareFeedback(null),2000);
                },active:shareFeedback===p.id,col:C.emerald},
              ].map((b,i)=>(
                <button key={i} onClick={b.act} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,background:"none",border:"none",cursor:"pointer",padding:"7px 4px",borderRadius:8,color:b.active?b.col:C.sub,fontWeight:600,fontSize:13}}>
                  <span>{b.emoji}</span><span style={{color:b.active?b.col:C.sub}}>{b.label}</span>
                </button>
              ))}
            </div>

            {/* Inline comment panel */}
            {openComments[p.id]&&(
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4}}>
                {/* Existing comments */}
                {(postComments[p.id]||[]).length===0&&<div style={{fontSize:12,color:C.sub,textAlign:"center",padding:"10px 0",marginBottom:12}}>Seja o primeiro a comentar.</div>}
                <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
                  {(postComments[p.id]||[]).map(c=>(
                    <div key={c.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={ava(C,32)}>{c.user.avatar}</div>
                      <div style={{flex:1,background:C.bg,borderRadius:10,padding:"9px 12px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <span style={{fontWeight:700,fontSize:12,color:C.text}}>{c.user.name}</span>
                          <span style={{fontSize:10,color:C.sub}}>{c.time}</span>
                        </div>
                        <div style={{fontSize:13,color:C.text,lineHeight:1.55}}>{c.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* New comment input */}
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={ava(C,32,true)}>{me.avatar}</div>
                  <div style={{flex:1}}>
                    <textarea
                      value={commentInputs[p.id]||""}
                      onChange={e=>setCommentInputs(prev=>({...prev,[p.id]:e.target.value}))}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitComment(p.id);}}}
                      placeholder="Escreva um comentário… (Enter para publicar)"
                      rows={2}
                      style={{...inp(C),fontSize:13,resize:"none",marginBottom:6}}
                    />
                    <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                      <button onClick={()=>toggleComments(p.id)} style={{...btn(C,"outline",true),fontSize:11}}>Fechar</button>
                      <button onClick={()=>submitComment(p.id)} disabled={!(commentInputs[p.id]||"").trim()}
                        style={{...btn(C,"primary",true),fontSize:11,opacity:!(commentInputs[p.id]||"").trim()?0.5:1}}>
                        💬 Publicar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {idx===1&&<VideoAdCard ad={VIDEO_ADS[1]} C={C} compact/>}
        </React.Fragment>
      ))}
      {visibleCount<posts.length&&(
        <button onClick={()=>setVisibleCount(c=>c+3)} style={{...btn(C,"outline"),width:"100%",justifyContent:"center",marginTop:4,marginBottom:14}}>
          {t("load_more")} ({posts.length-visibleCount} restantes)
        </button>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// COMMUNITY (Mensagens + Grupos + Reuniões)
// ══════════════════════════════════════════════════════════════════════════════
function Community({ C, t, isMobile, me }) {
  const [sub, setSub] = useState("messages");
  const [sel, setSel] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [newDmSearch, setNewDmSearch] = useState("");
  const [newDmResults, setNewDmResults] = useState([]);
  const [newDmLoading, setNewDmLoading] = useState(false);
  const [call, setCall] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [msgSearch, setMsgSearch] = useState("");
  const [msgSearchActive, setMsgSearchActive] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [newGroupSearch, setNewGroupSearch] = useState("");
  const [newGroupResults, setNewGroupResults] = useState([]);
  const [newGroupSearchLoading, setNewGroupSearchLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupMembers, setGroupMembers] = useState([]); // participants of the currently open group
  const [newMeetingOpen, setNewMeetingOpen] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState("");
  const [newMeetingMembers, setNewMeetingMembers] = useState([]);
  const [newMeetingSearch, setNewMeetingSearch] = useState("");
  const [newMeetingResults, setNewMeetingResults] = useState([]);
  const [newMeetingSearchLoading, setNewMeetingSearchLoading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const toggleMember = (id, list, setList) =>
    setList(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const [videoRoomUrl, setVideoRoomUrl] = useState(null);
  const [comFb, triggerComFb] = useFeedback();
  const showList = !isMobile || !sel;
  const showChat = !isMobile || sel;
  const now = () => new Date().toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"});
  const filteredConversations = msgSearchActive && msgSearch.trim()
    ? conversations.filter(c=>c.user.name.toLowerCase().includes(msgSearch.toLowerCase())||c.last.toLowerCase().includes(msgSearch.toLowerCase()))
    : conversations;

  const mapMessageRow = (m) => ({
    id: m.id,
    authorId: m.author_id,
    from: m.author_id===me.id ? "me" : "them",
    text: m.text,
    type: m.attachment_type || undefined,
    fileName: m.attachment_name || undefined,
    previewUrl: m.attachment_url || undefined,
    time: timeAgo(m.created_at),
  });

  // Loads both 1:1 conversations and group threads in one pass — they're
  // the same `conversations` table, split client-side by `is_group`.
  const loadThreads = async () => {
    setConversationsLoading(true); setGroupsLoading(true);
    const { data: parts, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", me.id);
    if(error){ console.error(error); setConversationsLoading(false); setGroupsLoading(false); return; }
    const convIds = (parts||[]).map(p=>p.conversation_id);
    if(convIds.length===0){ setConversations([]); setGroups([]); setConversationsLoading(false); setGroupsLoading(false); return; }
    const { data: convRows, error: err1 } = await supabase
      .from("conversations")
      .select("id, is_group, name, avatar")
      .in("id", convIds);
    if(err1){ console.error(err1); setConversationsLoading(false); setGroupsLoading(false); return; }
    const { data: allParts, error: err2 } = await supabase
      .from("conversation_participants")
      .select("conversation_id, profiles:user_id(id,full_name,specialty)")
      .in("conversation_id", convIds);
    if(err2) console.error(err2);
    const { data: lastMsgs } = await supabase
      .from("messages")
      .select("conversation_id, text, attachment_type, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });
    const lastByConv = {};
    (lastMsgs||[]).forEach(m=>{ if(!lastByConv[m.conversation_id]) lastByConv[m.conversation_id]=m; });
    const partsByConv = {};
    (allParts||[]).forEach(p=>{ (partsByConv[p.conversation_id] ||= []).push(p.profiles); });

    const dmList = [], groupList = [];
    (convRows||[]).forEach(c=>{
      const last = lastByConv[c.id];
      const lastText = last ? (last.text || (last.attachment_type ? "📎 anexo" : "")) : (c.is_group ? "Grupo criado" : "Conversa iniciada");
      const lastTime = last ? timeAgo(last.created_at) : "";
      if(c.is_group){
        groupList.push({
          id: c.id, isGroup: true, name: c.name||"Grupo", avatar: c.avatar||"👥",
          members: (partsByConv[c.id]||[]).length, last: lastText, time: lastTime, unread: 0,
        });
      } else {
        const other = (partsByConv[c.id]||[]).find(p=>p && p.id!==me.id);
        dmList.push({
          id: c.id, isGroup: false,
          user: { id: other?.id, name: other?.full_name||"Utilizador", avatar: initialsOf(other?.full_name), spec: other?.specialty||"", online: false },
          last: lastText, time: lastTime, unread: 0,
        });
      }
    });
    const byRecency = (a,b) => (lastByConv[b.id]?.created_at||"").localeCompare(lastByConv[a.id]?.created_at||"");
    dmList.sort(byRecency); groupList.sort(byRecency);
    setConversations(dmList); setGroups(groupList);
    setConversationsLoading(false); setGroupsLoading(false);
  };
  useEffect(() => { loadThreads(); }, [me.id]);

  const openConversation = async (conv) => {
    setSel(conv);
    setMessagesLoading(true);
    if(conv.isGroup){
      const { data: gp } = await supabase
        .from("conversation_participants")
        .select("profiles:user_id(id,full_name)")
        .eq("conversation_id", conv.id);
      setGroupMembers((gp||[]).map(p=>p.profiles).filter(Boolean));
    } else {
      setGroupMembers([]);
    }
    const { data, error } = await supabase
      .from("messages")
      .select("id, author_id, text, attachment_type, attachment_url, attachment_name, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    if(error){ console.error(error); setMessagesLoading(false); return; }
    setMessages((data||[]).map(mapMessageRow));
    setMessagesLoading(false);
  };

  useEffect(() => {
    if(!sel) return;
    const channel = supabase.channel(`messages:${sel.id}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"messages", filter:`conversation_id=eq.${sel.id}` }, payload => {
        if(payload.new.author_id === me.id) return; // already added optimistically
        setMessages(prev=>[...prev, mapMessageRow(payload.new)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sel?.id, me.id]);

  useEffect(() => {
    if(!newDmOpen) return;
    setNewDmLoading(true);
    const handle = setTimeout(async () => {
      let query = supabase.from("profiles").select("id, full_name, specialty").neq("id", me.id).limit(20);
      if(newDmSearch.trim()) query = query.ilike("full_name", `%${newDmSearch.trim()}%`);
      const { data, error } = await query;
      if(!error) setNewDmResults(data||[]);
      setNewDmLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [newDmOpen, newDmSearch, me.id]);

  const startConversation = async (otherUser) => {
    const { data: convId, error } = await supabase.rpc("get_or_create_dm", { other_user_id: otherUser.id });
    if(error){ console.error(error); return; }
    const conv = {
      id: convId, isGroup: false,
      user: { id: otherUser.id, name: otherUser.full_name||"Utilizador", avatar: initialsOf(otherUser.full_name), spec: otherUser.specialty||"", online:false },
      last: "", time: "", unread: 0,
    };
    setConversations(prev => prev.some(c=>c.id===convId) ? prev : [conv, ...prev]);
    setNewDmOpen(false); setNewDmSearch("");
    openConversation(conv);
  };

  // Debounced colleague search shared shape for the group + meeting invite pickers.
  useEffect(() => {
    if(!newGroupOpen) return;
    setNewGroupSearchLoading(true);
    const handle = setTimeout(async () => {
      let query = supabase.from("profiles").select("id, full_name, specialty").neq("id", me.id).limit(20);
      if(newGroupSearch.trim()) query = query.ilike("full_name", `%${newGroupSearch.trim()}%`);
      const { data, error } = await query;
      if(!error) setNewGroupResults(data||[]);
      setNewGroupSearchLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [newGroupOpen, newGroupSearch, me.id]);

  useEffect(() => {
    if(!newMeetingOpen) return;
    setNewMeetingSearchLoading(true);
    const handle = setTimeout(async () => {
      let query = supabase.from("profiles").select("id, full_name, specialty").neq("id", me.id).limit(20);
      if(newMeetingSearch.trim()) query = query.ilike("full_name", `%${newMeetingSearch.trim()}%`);
      const { data, error } = await query;
      if(!error) setNewMeetingResults(data||[]);
      setNewMeetingSearchLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [newMeetingOpen, newMeetingSearch, me.id]);

  const createGroup = async () => {
    if(!newGroupName.trim()) return;
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ created_by: me.id, is_group: true, name: newGroupName.trim(), avatar: "👥" })
      .select().single();
    if(error){ console.error(error); return; }
    const rows = [{ conversation_id: conv.id, user_id: me.id }, ...newGroupMembers.map(uid=>({ conversation_id: conv.id, user_id: uid }))];
    const { error: err2 } = await supabase.from("conversation_participants").insert(rows);
    if(err2){ console.error(err2); return; }
    setGroups(prev=>[{ id: conv.id, isGroup:true, name: conv.name, avatar: conv.avatar, members: newGroupMembers.length+1, last:"Grupo criado", time:"agora", unread:0 }, ...prev]);
    setNewGroupName(""); setNewGroupMembers([]); setNewGroupSearch(""); setNewGroupOpen(false);
  };

  const mapMeetingRow = (row, count) => ({
    id: row.id,
    title: row.title,
    host: row.host?.full_name || "Utilizador",
    date: row.scheduled_at ? new Date(row.scheduled_at).toLocaleString("pt-PT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "A definir",
    scheduledAt: row.scheduled_at,
    type: row.type,
    participants: count,
  });

  const loadMeetings = async () => {
    setMeetingsLoading(true);
    const { data, error } = await supabase
      .from("meetings")
      .select("*, host:host_id(full_name), meeting_participants(user_id)")
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if(error){ console.error(error); setMeetingsLoading(false); return; }
    setMeetings((data||[]).map(row=>mapMeetingRow(row, (row.meeting_participants||[]).length)));
    setMeetingsLoading(false);
  };
  useEffect(() => { loadMeetings(); }, []);

  const createMeeting = async () => {
    if(!newMeetingTitle.trim()) return;
    const scheduledAt = newMeetingDate ? new Date(newMeetingDate).toISOString() : null;
    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({ host_id: me.id, title: newMeetingTitle.trim(), scheduled_at: scheduledAt, type: "Reunião" })
      .select().single();
    if(error){ console.error(error); return; }
    const rows = [{ meeting_id: meeting.id, user_id: me.id }, ...newMeetingMembers.map(uid=>({ meeting_id: meeting.id, user_id: uid }))];
    const { error: err2 } = await supabase.from("meeting_participants").insert(rows);
    if(err2) console.error(err2);
    setMeetings(prev=>[mapMeetingRow({ ...meeting, host:{full_name:me.name} }, newMeetingMembers.length+1), ...prev]);
    setNewMeetingTitle(""); setNewMeetingDate(""); setNewMeetingMembers([]); setNewMeetingSearch(""); setNewMeetingOpen(false);
  };

  // A sent message updates whichever list (DM or group) the open thread belongs to.
  const updateThreadPreview = (id, patch) => {
    setConversations(prev=>prev.map(c=>c.id===id?{...c,...patch}:c));
    setGroups(prev=>prev.map(g=>g.id===id?{...g,...patch}:g));
  };

  const sendMsg = async () => {
    if(!input.trim()||!sel) return;
    const text = input.trim();
    setInput("");
    const tempId = `tmp-${Date.now()}`;
    setMessages(c=>[...c,{id:tempId,authorId:me.id,from:"me",text,time:now()}]);
    const { data, error } = await supabase.from("messages").insert({ conversation_id: sel.id, author_id: me.id, text }).select().single();
    if(error){ console.error(error); return; }
    setMessages(prev=>prev.map(m=>m.id===tempId?{...m,id:data.id}:m));
    updateThreadPreview(sel.id, { last:text, time:"agora" });
  };
  const handleFile = async (e, type) => {
    const f=e.target.files?.[0]; if(!f||!sel)return;
    setAttachOpen(false); e.target.value="";
    const isImg=type==="photo"||f.type.startsWith("image/");
    const isVid=type==="video"||f.type.startsWith("video/");
    const size=f.size>1048576?`${(f.size/1048576).toFixed(1)} MB`:`${Math.round(f.size/1024)} KB`;
    const previewUrl=(isImg||isVid)?URL.createObjectURL(f):null;
    const msgType=isImg?"image":isVid?"video":"document";
    const tempId = `tmp-${Date.now()}`;
    setMessages(c=>[...c,{id:tempId,authorId:me.id,from:"me",type:msgType,fileName:f.name,fileSize:size,previewUrl,time:now()}]);
    try {
      const path = `${me.id}/messages/${Date.now()}-${f.name}`;
      const { error: upErr } = await supabase.storage.from("post-media").upload(path, f);
      if(upErr) throw upErr;
      const { data: pub } = supabase.storage.from("post-media").getPublicUrl(path);
      const { data, error } = await supabase.from("messages").insert({
        conversation_id: sel.id, author_id: me.id, text: "",
        attachment_type: msgType, attachment_url: pub.publicUrl, attachment_name: f.name,
      }).select().single();
      if(error) throw error;
      setMessages(prev=>prev.map(m=>m.id===tempId?{...m,id:data.id,previewUrl:pub.publicUrl}:m));
      updateThreadPreview(sel.id, { last:`📎 ${f.name}`, time:"agora" });
    } catch(err) {
      console.error(err);
    }
  };

  const Bubble = ({m}) => {
    const me=m.from==="me";
    const base={maxWidth:"78%",borderRadius:14,fontSize:isMobile?13:13.5,overflow:"hidden"};
    if(m.type==="image") return (
      <div style={{...base,background:me?C.teal:C.bg,cursor:"pointer"}} onClick={()=>setPreviewImg(m.previewUrl||null)}>
        {m.previewUrl?<img src={m.previewUrl} alt={m.fileName} style={{width:"100%",maxWidth:240,display:"block",borderRadius:"14px 14px 0 0"}}/>
          :<div style={{width:200,height:110,background:me?C.tealD:C.border,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,borderRadius:"14px 14px 0 0"}}><span style={{fontSize:28}}>🖼️</span><span style={{fontSize:11,color:me?"rgba(255,255,255,0.7)":C.sub}}>{m.fileName}</span></div>}
        <div style={{padding:"6px 12px",display:"flex",justifyContent:"space-between",gap:8}}>
          <span style={{fontSize:11,color:me?"rgba(255,255,255,0.85)":C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{m.fileName}</span>
          <span style={{fontSize:10,opacity:0.6,flexShrink:0}}>{m.time}</span>
        </div>
      </div>
    );
    if(m.type==="video") return (
      <div style={{...base,background:me?C.teal:C.bg,overflow:"hidden"}}>
        {m.previewUrl?(
          <video
            src={m.previewUrl}
            controls
            playsInline
            style={{width:"100%",maxWidth:280,display:"block",borderRadius:"14px 14px 0 0",maxHeight:180,objectFit:"cover",background:"#000"}}
          />
        ):(
          <div style={{width:240,height:140,background:me?C.tealD:C.border,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,borderRadius:"14px 14px 0 0"}}>
            <span style={{fontSize:32}}>🎬</span>
            <span style={{fontSize:11,color:me?"rgba(255,255,255,0.7)":C.sub}}>{m.fileName}</span>
          </div>
        )}
        <div style={{padding:"6px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
            <span style={{fontSize:12}}>🎬</span>
            <span style={{fontSize:11,color:me?"rgba(255,255,255,0.85)":C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>{m.fileName}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            {m.fileSize&&<span style={{fontSize:10,color:me?"rgba(255,255,255,0.55)":C.sub}}>{m.fileSize}</span>}
            <span style={{fontSize:10,opacity:0.6}}>{m.time}</span>
          </div>
        </div>
      </div>
    );
    if(m.type==="document") {
      const ext=m.fileName?.split(".").pop()?.toLowerCase();
      const dCol={pdf:"#E05C6A",doc:"#2E75B6",docx:"#2E75B6",xls:"#27AE60",xlsx:"#27AE60"};
      const dIcon={pdf:"📄",doc:"📝",docx:"📝",xls:"📊",xlsx:"📊"};
      return (
        <div style={{...base,background:me?C.teal:C.bg,padding:"11px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <div style={{width:36,height:36,borderRadius:8,background:(dCol[ext]||C.sub)+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{dIcon[ext]||"📎"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:12,color:me?"#fff":C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.fileName}</div>
              <div style={{fontSize:10,color:me?"rgba(255,255,255,0.65)":C.sub}}>{m.fileSize}</div>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button onClick={()=>{if(m.previewUrl){window.open(m.previewUrl,"_blank");}else{triggerComFb("doc_open_"+m.time);}}} style={{background:me?"rgba(255,255,255,0.2)":C.bg,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:me?"#fff":C.teal,fontWeight:600}}>{comFb===("doc_open_"+m.time)?"✓ Aberto":t("open")}</button>
            <span style={{fontSize:10,opacity:0.6}}>{m.time}</span>
          </div>
        </div>
      );
    }
    return (
      <div style={{...base,padding:"9px 13px",background:me?C.teal:C.bg,color:me?"#fff":C.text}}>
        <div style={{lineHeight:1.5}}>{m.text}</div>
        <div style={{fontSize:10,opacity:0.6,marginTop:3,textAlign:"right"}}>{m.time}</div>
      </div>
    );
  };

  const SUBS=[{id:"messages",label:"💬 "+t("messages")},{id:"groups",label:"👥 "+t("community_groups")},{id:"meetings",label:"📅 "+t("community_meetings")},{id:"calendar",label:"🗓️ "+t("community_calendar")}];

  return (
    <div style={{height:isMobile?"calc(100vh - 110px)":"calc(100vh - 120px)",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",gap:0,background:C.bg,borderRadius:10,padding:4,marginBottom:12,flexShrink:0}}>
        {SUBS.map(s=>(
          <button key={s.id} onClick={()=>{setSub(s.id);setSel(null);}} style={{flex:1,padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:sub===s.id?700:500,fontSize:isMobile?11:12,background:sub===s.id?C.surface:"transparent",color:sub===s.id?C.teal:C.sub,boxShadow:sub===s.id?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all .15s",whiteSpace:"nowrap"}}>{s.label}</button>
        ))}
      </div>

      {(sub==="messages"||sub==="groups")&&(
        <div style={{flex:1,display:"flex",background:C.surface,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`,position:"relative"}}>
          {previewImg&&(
            <div onClick={()=>setPreviewImg(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
              <img src={previewImg} alt="preview" style={{maxWidth:"92vw",maxHeight:"88vh",borderRadius:12}}/>
              <button onClick={()=>setPreviewImg(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:40,height:40,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon d={ic.x} size={20} color="#fff"/></button>
            </div>
          )}
          {showList&&(
            <div style={{width:isMobile?"100%":270,borderRight:isMobile?"none":`1px solid ${C.border}`,display:"flex",flexDirection:"column"}}>
              {sub==="messages"?(
                <>
                  <div style={{padding:14,borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontWeight:700,fontSize:15,color:C.text}}>{t("messages")}</div>
                      <button onClick={()=>setNewDmOpen(v=>!v)} aria-label="Nova conversa"
                        style={{background:newDmOpen?C.mint:C.bg,border:"none",borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:13,fontWeight:700,color:C.teal}}>✉️+</button>
                    </div>
                    <SearchBar
                      value={msgSearch}
                      onChange={v=>{setMsgSearch(v);setMsgSearchActive(!!v);}}
                      onSearch={v=>{setMsgSearch(v);setMsgSearchActive(!!v);}}
                      placeholder={t("search_placeholder")}
                      C={C}
                    />
                  </div>
                  {newDmOpen&&(
                    <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,background:C.bg}}>
                      <input value={newDmSearch} onChange={e=>setNewDmSearch(e.target.value)}
                        placeholder={"🔍 "+t("search_colleagues")} style={{...inp(C),fontSize:12,marginBottom:8}}/>
                      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:180,overflowY:"auto"}}>
                        {newDmLoading&&<div style={{fontSize:12,color:C.sub,padding:"6px 0"}}>A procurar…</div>}
                        {!newDmLoading&&newDmResults.length===0&&<div style={{fontSize:12,color:C.sub,padding:"6px 0"}}>Sem colegas encontrados.</div>}
                        {newDmResults.map(u=>(
                          <div key={u.id} onClick={()=>startConversation(u)} role="button"
                            style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,cursor:"pointer",background:C.surface}}>
                            <div style={{...ava(C,28),flexShrink:0}}>{initialsOf(u.full_name)}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.full_name||"Utilizador"}</div>
                              <div style={{fontSize:10,color:C.sub}}>{u.specialty||""}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{overflowY:"auto",flex:1}}>
                    {conversationsLoading&&<div style={{padding:"20px 14px",textAlign:"center",color:C.sub,fontSize:13}}>A carregar…</div>}
                    {!conversationsLoading&&filteredConversations.length===0&&<div style={{padding:"20px 14px",textAlign:"center",color:C.sub,fontSize:13}}>{msgSearchActive&&msgSearch.trim()?`Sem resultados para "${msgSearch}"`:"Ainda sem conversas — use ✉️+ para começar."}</div>}
                    {filteredConversations.map(c=>(
                      <div key={c.id} onClick={()=>openConversation(c)} role="button"
                        style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",background:sel?.id===c.id?C.mint:"transparent",borderBottom:`1px solid ${C.border}`,transition:"background .15s"}}>
                        <div style={ava(C,38,c.user.online)}>{c.user.avatar}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between"}}>
                            <div style={{fontWeight:600,fontSize:13,color:C.text}}>{c.user.name}</div>
                            <div style={{fontSize:11,color:C.sub}}>{c.time}</div>
                          </div>
                          <div style={{fontSize:12,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.last}</div>
                        </div>
                        {c.unread>0&&<div style={{background:C.teal,color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{c.unread}</div>}
                      </div>
                    ))}
                  </div>
                </>
              ):(
                <>
                  <div style={{padding:14,borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontWeight:700,fontSize:15,color:C.text}}>Grupos</div>
                      <button onClick={()=>setNewGroupOpen(v=>!v)} aria-label="Novo grupo"
                        style={{background:newGroupOpen?C.mint:C.bg,border:"none",borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:13,fontWeight:700,color:C.teal}}>👥+</button>
                    </div>
                  </div>
                  {newGroupOpen&&(
                    <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,background:C.bg,maxHeight:"60vh",overflowY:"auto"}}>
                      <input value={newGroupName} onChange={e=>setNewGroupName(e.target.value)}
                        placeholder={t("group_name")+"…"} style={{...inp(C),fontSize:13,marginBottom:10}}/>
                      <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:6}}>ADICIONAR MEMBROS</label>
                      <input value={newGroupSearch} onChange={e=>setNewGroupSearch(e.target.value)}
                        placeholder={"🔍 "+t("search_colleagues")} style={{...inp(C),fontSize:12,marginBottom:8}}/>
                      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:160,overflowY:"auto",marginBottom:8}}>
                        {newGroupSearchLoading&&<div style={{fontSize:12,color:C.sub,padding:"6px 0"}}>A procurar…</div>}
                        {!newGroupSearchLoading&&newGroupResults.length===0&&<div style={{fontSize:12,color:C.sub,padding:"6px 0"}}>Sem colegas encontrados.</div>}
                        {newGroupResults.map(u=>{
                          const isSel = newGroupMembers.includes(u.id);
                          return (
                            <div key={u.id} onClick={()=>toggleMember(u.id,newGroupMembers,setNewGroupMembers)} role="button"
                              style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,cursor:"pointer",
                                background:isSel?C.mint:C.surface,border:`1px solid ${isSel?C.teal:C.border}`,transition:"all .12s"}}>
                              <div style={{...ava(C,28),flexShrink:0}}>{initialsOf(u.full_name)}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.full_name||"Utilizador"}</div>
                                <div style={{fontSize:10,color:C.sub}}>{u.specialty||""}</div>
                              </div>
                              <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${isSel?C.teal:C.border}`,
                                background:isSel?C.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                {isSel&&<span style={{color:"#fff",fontSize:10,lineHeight:1}}>✓</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                        <button onClick={()=>{setNewGroupOpen(false);setNewGroupName("");setNewGroupMembers([]);setNewGroupSearch("");}} style={{...btn(C,"outline",true),fontSize:11}}>Cancelar</button>
                        <button onClick={createGroup} disabled={!newGroupName.trim()}
                          style={{...btn(C,"primary",true),fontSize:11,opacity:!newGroupName.trim()?0.5:1}}>
                          Criar ({newGroupMembers.length+1})
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{overflowY:"auto",flex:1}}>
                    {groupsLoading&&<div style={{padding:"20px 14px",textAlign:"center",color:C.sub,fontSize:13}}>A carregar…</div>}
                    {!groupsLoading&&groups.length===0&&<div style={{padding:"20px 14px",textAlign:"center",color:C.sub,fontSize:13}}>Ainda sem grupos — use 👥+ para criar um.</div>}
                    {groups.map(g=>(
                      <div key={g.id} onClick={()=>openConversation(g)} role="button"
                        style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",background:sel?.id===g.id?C.mint:"transparent",borderBottom:`1px solid ${C.border}`,transition:"background .15s"}}>
                        <div style={{width:38,height:38,borderRadius:"50%",background:C.mint,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{g.avatar}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between"}}>
                            <div style={{fontWeight:600,fontSize:13,color:C.text}}>{g.name}</div>
                            <div style={{fontSize:11,color:C.sub}}>{g.time}</div>
                          </div>
                          <div style={{fontSize:11,color:C.sub}}>{g.members} membros</div>
                          <div style={{fontSize:12,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.last}</div>
                        </div>
                        {g.unread>0&&<div style={{background:C.teal,color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{g.unread}</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {showChat&&(sel?(
            <div style={{flex:1,display:"flex",flexDirection:"column",position:"relative"}}>
              <div style={{padding:isMobile?"10px 12px":"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,background:C.surface,flexShrink:0}}>
                {isMobile&&<button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",padding:4}} aria-label="Voltar"><Icon d={ic.back} size={20} color={C.sub}/></button>}
                {sel.isGroup?(
                  <div style={{width:34,height:34,borderRadius:"50%",background:C.mint,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{sel.avatar}</div>
                ):(
                  <div style={ava(C,34,sel.user.online)}>{sel.user.avatar}</div>
                )}
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.text}}>{sel.isGroup?sel.name:sel.user.name}</div>
                  <div style={{fontSize:11,color:sel.isGroup?C.sub:(sel.user.online?C.emerald:C.sub)}}>
                    {sel.isGroup?`${sel.members} membros`:(sel.user.online?t("online"):t("offline"))}
                  </div>
                </div>
                <button onClick={()=>setCall(!call)} style={{...btn(C,call?"danger":"outline",true),fontSize:11}}><Icon d={ic.phone} size={13}/>{!isMobile&&(call?"Terminar":"Chamar")}</button>
                <button onClick={()=>{triggerComFb("videocall");}} aria-label="Iniciar videochamada"
                  style={{...btn(C,comFb==="videocall"?"primary":"outline",true),fontSize:11}}>
                  <Icon d={ic.cam} size={13} color={comFb==="videocall"?"#fff":C.teal}/>{!isMobile&&(comFb==="videocall"?" A ligar…":"Vídeo")}
                </button>
              </div>
              {call&&(
                <div style={{background:C.night,padding:"22px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12,flexShrink:0}}>
                  <div style={ava(C,60,true)}>{sel.isGroup?sel.avatar:sel.user.avatar}</div>
                  <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{sel.isGroup?sel.name:sel.user.name}</div>
                  <div style={{color:C.mist,fontSize:12}}>Em chamada · 00:32</div>
                  <div style={{display:"flex",gap:14}}>
                    {[ic.mic,ic.cam,ic.phone].map((ico,i)=>(
                      <button key={i} onClick={i===2?()=>setCall(false):undefined}
                        style={{width:44,height:44,borderRadius:"50%",background:i===2?C.rose:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Icon d={ico} size={18} color="#fff"/>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{flex:1,overflowY:"auto",padding:isMobile?"12px 10px":"14px 18px",display:"flex",flexDirection:"column",gap:8}}>
                {messagesLoading&&<div style={{textAlign:"center",color:C.sub,fontSize:12}}>A carregar mensagens…</div>}
                {!messagesLoading&&messages.length===0&&<div style={{textAlign:"center",color:C.sub,fontSize:12}}>Ainda sem mensagens — diga olá 👋</div>}
                {messages.map((m,i)=>(
                  <div key={m.id||i} style={{display:"flex",flexDirection:"column",alignItems:m.from==="me"?"flex-end":"flex-start"}}>
                    {sel.isGroup&&m.from!=="me"&&(
                      <div style={{fontSize:10,color:C.sub,margin:"0 4px 2px"}}>{groupMembers.find(p=>p.id===m.authorId)?.full_name||"Membro"}</div>
                    )}
                    <Bubble m={m}/>
                  </div>
                ))}
              </div>
              {attachOpen&&(
                <div style={{position:"absolute",bottom:66,left:isMobile?10:18,background:C.surface,borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",border:`1px solid ${C.border}`,overflow:"hidden",zIndex:10}}>
                  {/* Chat attach: label+input overlay pattern */}
                  {[
                    {label:t("attach_photo"),icon:"📷",accept:"image/*",type:"photo"},
                    {label:"Vídeo",icon:"🎬",accept:"video/*",type:"video"},
                    {label:t("attach_file"),icon:"📄",accept:".pdf,.doc,.docx,.xls,.xlsx,.zip",type:"file"},
                  ].map((item,i)=>(
                    <label key={i} onClick={()=>setAttachOpen(false)}
                      style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",
                        cursor:"pointer",borderBottom:i<2?`1px solid ${C.border}`:"none",
                        background:C.surface,position:"relative",overflow:"hidden"}}>
                      <span style={{fontSize:20}}>{item.icon}</span>
                      <span style={{fontSize:13,color:C.text,fontWeight:500}}>{item.label}</span>
                      <input type="file" accept={item.accept}
                        style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",fontSize:0,zIndex:2}}
                        onChange={e=>handleFile(e,item.type)}/>
                    </label>
                  ))}
                </div>
              )}
              <div style={{padding:isMobile?"10px":"11px 18px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"center",background:C.surface,flexShrink:0}}>
                <button onClick={()=>setAttachOpen(a=>!a)} aria-label="Anexar"
                  style={{background:attachOpen?C.mint:C.bg,border:"none",borderRadius:9,padding:"9px 11px",cursor:"pointer",display:"flex",alignItems:"center",flexShrink:0}}>
                  <span style={{fontSize:18}}>➕</span>
                </button>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()}
                  placeholder={t("typing")} style={{...inp(C),flex:1,fontSize:13}} onClick={()=>setAttachOpen(false)}/>
                <button onClick={sendMsg} style={{...btn(C,"primary"),padding:"10px 14px",flexShrink:0}} aria-label={t("send")}><Icon d={ic.send} size={15}/></button>
              </div>
            </div>
          ):(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,color:C.sub}}>
              <div style={{fontSize:36}}>{sub==="groups"?"👥":"💬"}</div>
              <div style={{fontWeight:600,color:C.sub}}>{sub==="groups"?"Selecione um grupo":t("select_conv")}</div>
            </div>
          ))}
        </div>
      )}

      {sub==="meetings"&&(
        <div style={{flex:1,overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:15,color:C.text}}>Reuniões & Videochamadas</div>
            <button onClick={()=>setNewMeetingOpen(true)} style={btn(C,"primary",true)}>+ Nova</button>
          </div>
          {newMeetingOpen&&(
            <div style={{...card(C),border:`1.5px solid ${C.teal}`,marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:13,color:C.teal,marginBottom:10}}>Nova Reunião</div>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
                <input value={newMeetingTitle} onChange={e=>setNewMeetingTitle(e.target.value)} placeholder={t("meeting_title")+"…"} style={{...inp(C),fontSize:13}}/>
                <input type="datetime-local" value={newMeetingDate} onChange={e=>setNewMeetingDate(e.target.value)} style={{...inp(C),fontSize:13}}/>
              </div>
              {/* Member picker */}
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:6}}>CONVIDAR PARTICIPANTES</label>
                <input value={newMeetingSearch} onChange={e=>setNewMeetingSearch(e.target.value)}
                  placeholder={"🔍 "+t("search_colleagues")} style={{...inp(C),fontSize:12,marginBottom:8}}/>
                <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:160,overflowY:"auto"}}>
                  {newMeetingSearchLoading&&<div style={{fontSize:12,color:C.sub,padding:"6px 0"}}>A procurar…</div>}
                  {!newMeetingSearchLoading&&newMeetingResults.length===0&&<div style={{fontSize:12,color:C.sub,padding:"6px 0"}}>Sem colegas encontrados.</div>}
                  {newMeetingResults.map(u=>{
                    const sel=newMeetingMembers.includes(u.id);
                    return (
                      <div key={u.id} onClick={()=>toggleMember(u.id,newMeetingMembers,setNewMeetingMembers)}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,cursor:"pointer",
                          background:sel?C.mint:C.bg,border:`1px solid ${sel?C.teal:C.border}`,transition:"all .12s"}}>
                        <div style={{...ava(C,32),flexShrink:0}}>{initialsOf(u.full_name)}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:700,color:C.text}}>{u.full_name||"Utilizador"}</div>
                          <div style={{fontSize:10,color:C.sub}}>{u.specialty||""}</div>
                        </div>
                        <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${sel?C.teal:C.border}`,
                          background:sel?C.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {sel&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {newMeetingMembers.length>0&&(
                  <div style={{fontSize:11,color:C.teal,fontWeight:600,marginTop:6}}>
                    {newMeetingMembers.length} {newMeetingMembers.length===1?"participante convidado":"participantes convidados"}
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>{setNewMeetingOpen(false);setNewMeetingTitle("");setNewMeetingDate("");setNewMeetingMembers([]);setNewMeetingSearch("");}} style={btn(C,"outline",true)}>Cancelar</button>
                <button onClick={createMeeting} disabled={!newMeetingTitle.trim()}
                  style={{...btn(C,"primary",true),opacity:!newMeetingTitle.trim()?0.5:1}}>
                  Agendar ({newMeetingMembers.length+1} participante{newMeetingMembers.length!==0?"s":""})
                </button>
              </div>
            </div>
          )}
          {meetingsLoading&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>A carregar reuniões…</div>}
          {!meetingsLoading&&meetings.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>Ainda sem reuniões agendadas.</div>}
          {meetings.map(m=>(
            <div key={m.id} style={card(C)}>
              <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={tag(C.teal)}>{m.type}</span>
                    <span style={tag(C.emerald)}>✓ Confirmado</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text,marginBottom:4}}>{m.title}</div>
                  <div style={{fontSize:12,color:C.sub}}>📅 {m.date} · 👥 {m.participants}</div>
                </div>
                <div style={{display:"flex",gap:6,flexDirection:isMobile?"column":"row",flexShrink:0}}>
                  <button onClick={()=>triggerComFb("detail_"+m.id)} style={btn(C,"outline",true)}>
                    {comFb===("detail_"+m.id)?"✓ Partilhado":"Detalhes"}
                  </button>
                  <button onClick={()=>{setVideoRoomUrl(`https://meet.vetconnect.pt/room-${m.id}`);triggerComFb("enter_"+m.id);}} style={{...btn(C,"primary",true),background:C.emerald}}>
                    {comFb===("enter_"+m.id)?"🟢 A entrar…":"Entrar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {videoRoomUrl&&(
            <div style={{...card(C),background:C.emerald+"15",border:`1.5px solid ${C.emerald}`,marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:13,color:C.emerald,marginBottom:6}}>🟢 Sala de videochamada criada</div>
              <div style={{fontSize:12,color:C.sub,marginBottom:10}}>{videoRoomUrl}</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>navigator.clipboard?.writeText(videoRoomUrl).then(()=>triggerComFb("copy_link"))}
                  style={{...btn(C,"outline",true),fontSize:11}}>{comFb==="copy_link"?"✓ Copiado!":"📋 Copiar link"}</button>
                <button onClick={()=>setVideoRoomUrl(null)} style={{...btn(C,"outline",true),fontSize:11}}>Fechar</button>
              </div>
            </div>
          )}
          <div style={{...card(C),background:"linear-gradient(135deg,#0F1923,#1C2B35)",color:"#fff"}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>🎥 Videochamada Rápida</div>
            <div style={{fontSize:12,opacity:0.7,marginBottom:14}}>Sala instantânea — partilhe o link com colegas</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>{const url=`https://meet.vetconnect.pt/room-${Date.now()}`;setVideoRoomUrl(url);setSub("meetings");}}
                style={{background:C.teal,color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{"📹 "+t("video_call")}</button>
              <button onClick={()=>setNewMeetingOpen(true)}
                style={{background:"rgba(255,255,255,0.12)",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:12,cursor:"pointer"}}>{"📅 "+t("schedule")}</button>
            </div>
          </div>
        </div>
      )}

      {sub==="calendar"&&(()=>{
        // Aggregate real meetings + mock live/learning events into one unified agenda.
        // Meetings have a real `scheduledAt` timestamp, so they bucket by actual date;
        // LIVE_EVENTS are still mock/text dates, so they keep the old string-prefix heuristic.
        const now = new Date();
        const tomorrowDate = new Date(now); tomorrowDate.setDate(now.getDate()+1);
        const isSameDay = (d1,d2) => d1.getFullYear()===d2.getFullYear() && d1.getMonth()===d2.getMonth() && d1.getDate()===d2.getDate();

        const meetingAgenda = meetings.map(m=>({
          title:m.title, host:m.host, when:m.date, kind:m.type, icon:"📹", color:C.teal,
          bucket: m.scheduledAt ? (isSameDay(new Date(m.scheduledAt),now)?"today":isSameDay(new Date(m.scheduledAt),tomorrowDate)?"tomorrow":"later") : "later",
        }));
        const learningEvents = LIVE_EVENTS.map(e=>({
          title:e.title, host:e.speaker, when:e.date, kind:e.status==="live"?"Ao Vivo":"Formação", icon:e.icon, color:e.status==="live"?C.rose:C.purple,
          bucket: e.date.toLowerCase().startsWith("hoje")?"today":e.date.toLowerCase().startsWith("amanhã")?"tomorrow":"later",
        }));
        const agenda = [...meetingAgenda, ...learningEvents];
        const today = agenda.filter(a=>a.bucket==="today");
        const tomorrow = agenda.filter(a=>a.bucket==="tomorrow");
        const later = agenda.filter(a=>a.bucket==="later");

        const Group = ({label, items}) => items.length>0 && (
          <div style={{marginBottom:18}}>
            <div style={{fontSize:12,fontWeight:800,color:C.sub,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>{label}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {items.map((a,i)=>(
                <div key={i} style={{...card(C,{marginBottom:0}),display:"flex",alignItems:"center",gap:12,borderLeft:`4px solid ${a.color}`}}>
                  <div style={{fontSize:24,flexShrink:0}}>{a.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.title}</div>
                    <div style={{fontSize:11,color:C.sub}}>{a.host} · {a.when}</div>
                  </div>
                  <span style={tag(a.color)}>{a.kind}</span>
                </div>
              ))}
            </div>
          </div>
        );

        return (
          <div style={{flex:1,overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:C.text}}>🗓️ Calendário Unificado</div>
                <div style={{fontSize:11,color:C.sub}}>Reuniões, lives e formações num só lugar</div>
              </div>
              <button onClick={()=>{setSub("meetings");setNewMeetingOpen(true);}} style={btn(C,"outline",true)}>+ Lembrete</button>
            </div>
            {agenda.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"40px 0"}}>Sem eventos agendados.</div>}
            <Group label="Hoje" items={today}/>
            <Group label="Amanhã" items={tomorrow}/>
            <Group label="Próximos dias" items={later}/>
          </div>
        );
      })()}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// LEARN (Live Streaming + Cursos)
// ══════════════════════════════════════════════════════════════════════════════
function Learn({ C, t, isMobile }) {
  const [sub, setSub] = useState("live");
  const [liveEv, setLiveEv] = useState(null);
  const [filter, setFilter] = useState("Todos");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [liveSearch, setLiveSearch] = useState("");
  const [liveQuery, setLiveQuery] = useState("");
  const [inscribed, setInscribed] = useState([]);
  const [liveChat, setLiveChat] = useState("");
  const [liveChatHistory, setLiveChatHistory] = useState([
    {u:"Dra. Ana F.",txt:"Excelente! Quais os valores de referência?",t2:"14:02"},
    {u:"Dr. Rui S.",txt:"Protocolo muito bem estruturado 👍",t2:"14:03"},
    {u:"Dra. Marta L.",txt:"Podem partilhar os slides?",t2:"14:05"},
  ]);
  const [learnFb, triggerLearnFb] = useFeedback();

  const liveNow = LIVE_EVENTS.filter(e=>e.status==="live"&&(!liveQuery||e.title.toLowerCase().includes(liveQuery.toLowerCase())||e.tags.some(tag=>tag.toLowerCase().includes(liveQuery.toLowerCase()))));
  const upcoming = LIVE_EVENTS.filter(e=>e.status==="upcoming"&&(!liveQuery||e.title.toLowerCase().includes(liveQuery.toLowerCase())||e.tags.some(tag=>tag.toLowerCase().includes(liveQuery.toLowerCase()))));
  const filteredCourses = COURSES.filter(c=>{
    const matchType = filter==="Todos"||c.type===filter;
    const matchQ = !courseQuery||
      c.title.toLowerCase().includes(courseQuery.toLowerCase())||
      c.author.toLowerCase().includes(courseQuery.toLowerCase())||
      c.type.toLowerCase().includes(courseQuery.toLowerCase());
    return matchType&&matchQ;
  });
  const SUBS=[{id:"live",label:"📡 "+t("learn_live")},{id:"courses",label:"🎓 "+t("learn_courses")},{id:"promo",label:"📢 "+t("learn_promo")}];

  if(liveEv) return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,18,26,0.97)",zIndex:500,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:isMobile?"10px 14px":"12px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)",flexShrink:0}}>
        <button onClick={()=>setLiveEv(null)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"7px 10px",cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",gap:6,fontSize:12}}>
          <Icon d={ic.back} size={15} color="#fff"/>{!isMobile&&"Sair"}
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:"#fff",fontWeight:700,fontSize:isMobile?12:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{liveEv.title}</div>
          <div style={{color:C.mist,fontSize:11}}>{liveEv.speaker}</div>
        </div>
        <div style={{background:C.rose,color:"#fff",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#fff",display:"inline-block"}}/> AO VIVO
        </div>
        <div style={{color:C.mist,fontSize:11,flexShrink:0}}>👁 {liveEv.viewers?.toLocaleString()||"—"}</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:isMobile?"column":"row",overflow:"hidden"}}>
        <div style={{flex:1,background:`linear-gradient(135deg,#0a1218,#095E62,#0a1218)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",minHeight:isMobile?200:"auto"}}>
          <div style={{width:isMobile?"85%":"65%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:isMobile?"20px":"36px 40px",textAlign:"center"}}>
            <div style={{fontSize:isMobile?36:56,marginBottom:10}}>{liveEv.icon}</div>
            <div style={{color:"#fff",fontWeight:800,fontSize:isMobile?14:20,lineHeight:1.3,marginBottom:8}}>{liveEv.slideTitle}</div>
            <div style={{color:C.mintD,fontSize:isMobile?11:13,lineHeight:1.6}}>{liveEv.slideSubtitle}</div>
          </div>
          <div style={{position:"absolute",bottom:isMobile?8:14,right:isMobile?8:14,width:isMobile?60:100,height:isMobile?44:70,background:"linear-gradient(135deg,#0F1923,#1C2B35)",borderRadius:8,border:"2px solid rgba(255,255,255,0.15)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3}}>
            <div style={{width:isMobile?22:32,height:isMobile?22:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.tealL})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:isMobile?9:12}}>{liveEv.speakerAvatar}</div>
            {!isMobile&&<div style={{color:"#fff",fontSize:9,textAlign:"center",lineHeight:1.2}}>{liveEv.speaker.split(" ").slice(0,2).join(" ")}</div>}
          </div>
          <div style={{position:"absolute",top:10,left:10,display:"flex",gap:8,alignItems:"center"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:C.rose,boxShadow:`0 0 0 3px ${C.rose}40`}}/>
            <span style={{color:"rgba(255,255,255,0.8)",fontSize:10,fontWeight:600}}>TRANSMISSÃO EM DIRETO</span>
          </div>
        </div>
        <div style={{width:isMobile?"100%":280,borderLeft:isMobile?"none":"1px solid rgba(255,255,255,0.07)",display:"flex",flexDirection:"column",flexShrink:0,maxHeight:isMobile?220:"auto"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",fontWeight:700,fontSize:13,color:"#fff"}}>💬 Chat ao Vivo</div>
          <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
            {liveChatHistory.map((m,i)=>(
              <div key={i}><div style={{fontSize:11,fontWeight:700,color:C.amber,marginBottom:2}}>{m.u} <span style={{color:"rgba(255,255,255,0.4)",fontWeight:400}}>{m.t2}</span></div><div style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>{m.txt}</div></div>
            ))}
          </div>
          <div style={{padding:"10px 12px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",gap:8}}>
            <input value={liveChat} onChange={e=>setLiveChat(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&liveChat.trim()){setLiveChatHistory(h=>[...h,{u:"Dr. Eu",txt:liveChat.trim(),t2:new Date().toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}]);setLiveChat("");}}}
              placeholder="Chat…" style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 10px",color:"#fff",fontSize:12,outline:"none"}}/>
            <button onClick={()=>{if(!liveChat.trim())return;setLiveChatHistory(h=>[...h,{u:"Dr. Eu",txt:liveChat.trim(),t2:new Date().toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}]);setLiveChat("");}}
              aria-label="Enviar mensagem no chat"
              style={{background:C.teal,border:"none",borderRadius:8,padding:"8px 10px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon d={ic.send} size={14} color="#fff"/></button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text}}>Formação Profissional</div>
        <button onClick={()=>triggerLearnFb("pub")} style={btn(C,"primary",isMobile)}>{learnFb==="pub"?t("published"):"+ "+t("publish")}</button>
      </div>
      <div style={{display:"flex",gap:0,background:C.bg,borderRadius:10,padding:4,marginBottom:18}}>
        {SUBS.map(s=><button key={s.id} onClick={()=>setSub(s.id)} style={{flex:1,padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:sub===s.id?700:500,fontSize:isMobile?11:12.5,background:sub===s.id?C.surface:"transparent",color:sub===s.id?C.teal:C.sub,boxShadow:sub===s.id?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all .15s",whiteSpace:"nowrap"}}>{s.label}</button>)}
      </div>
      {sub==="live"&&(
        <div>
          {/* Search bar for live section */}
          <SearchBar
            value={liveSearch}
            onChange={v=>{setLiveSearch(v);setLiveQuery(v);}}
            onSearch={v=>{setLiveSearch(v);setLiveQuery(v);}}
            placeholder="🔍 Pesquisar congressos, palestras, temas…"
            C={C}
            style={{marginBottom:18}}
          />
          {liveQuery&&liveNow.length===0&&upcoming.length===0&&(
            <div style={{textAlign:"center",color:C.sub,padding:"30px 0",fontSize:14}}>
              <div style={{fontSize:36,marginBottom:10}}>🔍</div>
              Sem resultados para "<strong>{liveQuery}</strong>"
            </div>
          )}
          {liveNow.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.rose,boxShadow:`0 0 0 3px ${C.rose}35`}}/>
                <div style={{fontWeight:800,fontSize:14,color:C.rose}}>EM DIRETO AGORA</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:14}}>
                {liveNow.map(ev=>(
                  <div key={ev.id} onClick={()=>setLiveEv(ev)} style={{...card(C,{marginBottom:0}),cursor:"pointer",border:`2px solid ${C.rose}40`}}>
                    <div style={{height:isMobile?100:130,background:"linear-gradient(135deg,#0F1923,#095E62)",borderRadius:10,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?38:50,position:"relative",overflow:"hidden"}}>
                      {ev.icon}
                      <div style={{position:"absolute",top:10,left:10,background:C.rose,color:"#fff",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",gap:4}}><span style={{width:5,height:5,borderRadius:"50%",background:"#fff",display:"inline-block"}}/> AO VIVO</div>
                      <div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,0.6)",color:"#fff",borderRadius:6,padding:"3px 8px",fontSize:11}}>👁 {ev.viewers.toLocaleString()}</div>
                    </div>
                    <div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap"}}>{ev.tags.map(tg=><span key={tg} style={tag(C.teal)}>#{tg}</span>)}</div>
                    <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text,marginBottom:3}}>{ev.title}</div>
                    <div style={{fontSize:11,color:C.sub,marginBottom:10}}>{ev.speaker} · {ev.duration} · 🎓 {ev.cpd} CPD</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={tag(C.emerald)}>{ev.price}</span>
                      <button onClick={e=>{e.stopPropagation();setLiveEv(ev);}} style={{...btn(C,"danger",true),background:C.rose,fontSize:12}}>▶ Assistir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>📅 Próximos Eventos</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:14,marginBottom:18}}>
            {upcoming.map(ev=>(
              <div key={ev.id} style={{...card(C,{marginBottom:0}),border:`1.5px solid ${C.border}`}}>
                <div style={{height:isMobile?80:100,background:`linear-gradient(135deg,${C.ink},${C.slate})`,borderRadius:10,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?36:46,position:"relative"}}>
                  {ev.icon}
                  <div style={{position:"absolute",top:10,left:10,background:"rgba(255,255,255,0.15)",color:"#fff",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700}}>EM BREVE</div>
                </div>
                <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text,marginBottom:3}}>{ev.title}</div>
                <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{ev.speaker} · 🎓 {ev.cpd} CPD</div>
                <div style={{fontSize:11,color:C.sub,marginBottom:10}}>📅 {ev.date} · ⏱ {ev.duration}</div>
                <div style={{background:C.bg,borderRadius:8,padding:"8px 10px",marginBottom:12,fontSize:11,color:C.sub,lineHeight:1.5}}><span style={{fontWeight:700}}>Programa: </span>{ev.program}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:800,fontSize:15,color:ev.price==="Gratuito"?C.emerald:C.teal}}>{ev.price}</span>
                    <button onClick={()=>{setInscribed(p=>p.includes(ev.id)?p.filter(x=>x!==ev.id):[...p,ev.id]);}} style={{...btn(C,"primary",true),background:inscribed.includes(ev.id)?C.emerald:C.teal}}>
                      {inscribed.includes(ev.id)?"✓ "+t("enrolled"):"🔔 "+t("enroll")}
                    </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{...card(C),background:`linear-gradient(135deg,#0F1923,${C.tealD})`,color:"#fff"}}>
            <div style={{fontWeight:800,fontSize:isMobile?14:17,marginBottom:6}}>📡 Transmita o seu Evento</div>
            <div style={{fontSize:12,opacity:0.8,marginBottom:14,lineHeight:1.6}}>Organize congressos, palestras e workshops ao vivo. Certificação CPD automática, gravação e chat integrados.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>triggerLearnFb("stream")} style={{background:C.teal,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {learnFb==="stream"?t("broadcasting"):"📡 "+t("start_broadcast")}
              </button>
              <button onClick={()=>triggerLearnFb("sched")} style={{background:"rgba(255,255,255,0.12)",color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:12,cursor:"pointer"}}>
                {learnFb==="sched"?t("scheduled"):"📅 "+t("schedule")}
              </button>
              <button onClick={()=>triggerLearnFb("sched2")} style={{background:"rgba(255,255,255,0.12)",color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:12,cursor:"pointer"}}>
                {learnFb==="sched2"?t("scheduled"):"📅 "+t("schedule")}
              </button>
            </div>
          </div>
          {/* Sponsored banner */}
          {(()=>{const ad=LEARN_ADS[2];return(
            <div onClick={()=>window.open(ad.url,"_blank")} style={{background:`linear-gradient(135deg,${ad.color}15,${ad.color}05)`,border:`1px solid ${ad.color}30`,borderRadius:12,padding:"14px 16px",cursor:"pointer",display:"flex",gap:12,alignItems:"center",marginTop:4}}>
              <div style={{width:42,height:42,borderRadius:10,background:ad.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{ad.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,color:ad.color,fontWeight:700,marginBottom:2,textTransform:"uppercase",letterSpacing:0.5}}>{ad.tag} · {ad.brand}</div>
                <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ad.title}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>{ad.features.slice(0,2).join(" · ")}</div>
              </div>
              <div style={{background:ad.color,color:"#fff",borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:700,flexShrink:0,whiteSpace:"nowrap"}}>{ad.cta}</div>
            </div>
          );})()}
        </div>
      )}
      {sub==="courses"&&(
        <div>
          {/* Search bar — live filter as you type + submit on Enter/button */}
          <SearchBar
            value={courseSearch}
            onChange={v=>{setCourseSearch(v);setCourseQuery(v);}}
            onSearch={v=>{setCourseSearch(v);setCourseQuery(v);}}
            placeholder="🔍 Pesquisar cursos, autores, temas…"
            C={C}
            style={{marginBottom:14}}
          />
          {/* Type filter pills — values match COURSES data exactly */}
          <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
            {["Todos","Curso","Webinar","Certificação","Masterclass","E-book"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?C.teal:C.surface,color:filter===f?"#fff":C.sub,border:`1px solid ${filter===f?C.teal:C.border}`,borderRadius:18,padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                {f==="Todos"?"Todos":f==="E-book"?"E-books":f+"s"}
              </button>
            ))}
          </div>
          {/* Empty state */}
          {filteredCourses.length===0&&(
            <div style={{textAlign:"center",color:C.sub,padding:"30px 0",fontSize:14}}>
              <div style={{fontSize:36,marginBottom:10}}>📚</div>
              Sem resultados para "<strong>{courseQuery||filter}</strong>"
              <div style={{marginTop:12}}>
                <button onClick={()=>{setCourseSearch("");setCourseQuery("");setFilter("Todos");}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",color:C.teal,fontSize:12,fontWeight:600}}>Limpar filtros</button>
              </div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:14}}>
            {filteredCourses.map(c=>(
              <div key={c.id} style={{...card(C,{marginBottom:0})}}>
                <div style={{height:isMobile?80:100,background:`linear-gradient(135deg,${C.teal}18,${C.purple}18)`,borderRadius:10,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?36:44}}>{c.icon}</div>
                <span style={tag(C.purple)}>{c.type}</span>
                <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text,margin:"8px 0 3px"}}>{c.title}</div>
                <div style={{fontSize:11,color:C.sub,marginBottom:6}}>por {c.author} · {c.duration}{c.cpd>0?` · 🎓 ${c.cpd} CPD`:""}</div>
                <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:12}}>
                  <Icon d={ic.star} size={12} color={C.gold}/><span style={{fontSize:12,fontWeight:600,color:C.text}}>{c.rating}</span><span style={{fontSize:11,color:C.sub}}>({c.reviews})</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:800,fontSize:17,color:C.teal}}>{c.price}</div>
                  <button onClick={()=>{setInscribed(p=>p.includes(c.id+100)?p.filter(x=>x!==c.id+100):[...p,c.id+100]);}} style={{...btn(C,"primary",true),background:inscribed.includes(c.id+100)?C.emerald:C.teal}}>
                    {inscribed.includes(c.id+100)?"✓ "+t("enrolled"):"Inscrever"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Sponsored banner in courses */}
          {(()=>{const ad=LEARN_ADS[0];return(
            <div onClick={()=>window.open(ad.url,"_blank")} style={{background:`linear-gradient(135deg,${ad.color}15,${ad.color}05)`,border:`1px solid ${ad.color}30`,borderRadius:12,padding:"14px 16px",cursor:"pointer",display:"flex",gap:12,alignItems:"center",marginTop:8}}>
              <div style={{width:42,height:42,borderRadius:10,background:ad.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{ad.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,color:ad.color,fontWeight:700,marginBottom:2,textTransform:"uppercase",letterSpacing:0.5}}>{ad.tag} · {ad.brand}</div>
                <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ad.title}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>{ad.features.slice(0,2).join(" · ")}</div>
              </div>
              <div style={{background:ad.color,color:"#fff",borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:700,flexShrink:0,whiteSpace:"nowrap"}}>{ad.cta}</div>
            </div>
          );})()}
        </div>
      )}

      {/* ── DIVULGAÇÃO / PUBLICIDADE ────────────────────────────────────────── */}
      {sub==="promo"&&(
        <div>
          {/* Header */}
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text,marginBottom:4}}>📢 Divulgação & Publicidade</div>
            <div style={{fontSize:12,color:C.sub}}>Formações, congressos, webinars e oportunidades patrocinadas para a comunidade veterinária</div>
          </div>

          {/* Featured ad — destaque */}
          {LEARN_ADS.slice(0,1).map(ad=>(
            <div key={ad.id} style={{background:`linear-gradient(135deg,${ad.color},${ad.color}cc)`,borderRadius:16,padding:isMobile?"18px 16px":"22px 24px",marginBottom:18,color:"#fff",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-20,right:-20,fontSize:80,opacity:0.12}}>{ad.icon}</div>
              <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{background:"rgba(255,255,255,0.25)",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{ad.tag}</span>
                <span style={{background:"rgba(255,255,255,0.9)",color:ad.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:800}}>{ad.badge}</span>
              </div>
              <div style={{fontWeight:800,fontSize:isMobile?15:18,marginBottom:8,lineHeight:1.3}}>{ad.title}</div>
              <div style={{fontSize:isMobile?12:13,opacity:0.88,marginBottom:14,lineHeight:1.6}}>{ad.desc}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                {ad.features.map((f,i)=>(
                  <span key={i} style={{background:"rgba(255,255,255,0.18)",borderRadius:20,padding:"4px 10px",fontSize:11,display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:10}}>✓</span>{f}
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                <button onClick={()=>window.open(ad.url,"_blank")}
                  style={{background:"#fff",color:ad.color,border:"none",borderRadius:9,padding:"10px 20px",fontSize:13,fontWeight:800,cursor:"pointer"}}>
                  {ad.cta} →
                </button>
                <div style={{fontSize:11,opacity:0.7}}>por {ad.brand}</div>
              </div>
            </div>
          ))}

          {/* Other ads */}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
            {LEARN_ADS.slice(1).map(ad=>(
              <div key={ad.id} style={{...card(C,{marginBottom:0}),borderLeft:`4px solid ${ad.color}`}}>
                <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:48,height:48,borderRadius:12,background:ad.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{ad.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:10,background:ad.color+"20",color:ad.color,borderRadius:20,padding:"2px 8px",fontWeight:700}}>{ad.tag}</span>
                      <span style={{fontSize:10,background:"#FFD70020",color:"#B8860B",borderRadius:20,padding:"2px 8px",fontWeight:700}}>{ad.badge}</span>
                    </div>
                    <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text,marginBottom:4}}>{ad.title}</div>
                    <div style={{fontSize:11,color:C.sub,lineHeight:1.5,marginBottom:8}}>{ad.desc}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                      {ad.features.map((f,i)=>(
                        <span key={i} style={{fontSize:10,color:C.sub,background:C.bg,borderRadius:20,padding:"2px 8px",border:`1px solid ${C.border}`}}>✓ {f}</span>
                      ))}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:11,color:C.sub}}>por {ad.brand}</div>
                      <button onClick={()=>window.open(ad.url,"_blank")}
                        style={{background:ad.color,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        {ad.cta} →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA para anunciantes */}
          <div style={{...card(C),border:`2px dashed ${C.border}`,textAlign:"center",padding:"24px 18px"}}>
            <div style={{fontSize:32,marginBottom:10}}>📣</div>
            <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:6}}>Quer divulgar o seu evento ou formação?</div>
            <div style={{fontSize:12,color:C.sub,lineHeight:1.6,marginBottom:16,maxWidth:380,margin:"0 auto 16px"}}>
              Alcance mais de 12.000 médicos veterinários em 45 países. Coloque o seu congresso, webinar, curso ou produto na plataforma VetConnect.
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>window.open("mailto:publicidade@vetconnect.pt?subject=Pedido+de+Publicidade","_blank")}
                style={{background:C.teal,color:"#fff",border:"none",borderRadius:9,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                📧 Pedir informações
              </button>
              <button onClick={()=>window.open("mailto:publicidade@vetconnect.pt?subject=Media+Kit+VetConnect","_blank")}
                style={{...btn(C,"outline",true),fontSize:12}}>
                📄 Media Kit
              </button>
            </div>
            <div style={{fontSize:10,color:C.sub,marginTop:12}}>publicidade@vetconnect.pt</div>
          </div>
        </div>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// MARKET (Marketplace + Jobs + Suppliers)
// ══════════════════════════════════════════════════════════════════════════════
// ── Supplier Detail Component ─────────────────────────────────────────────────
function SupplierDetail({ s, C, t, isMobile, onBack }) {
  const [supTab, setSupTab] = useState("products");
  const [playingVideo, setPlayingVideo] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [supFb, triggerSupFb] = useFeedback();
  const uploadRef = useRef(null);

  const videos = (s.media?.filter(m=>m.type==="video")||[]).filter(v=>{
    // Only videos ≤ 5 minutes — parse "M:SS" format
    const [mins] = (v.duration||"0:00").split(":").map(Number);
    return mins <= 5;
  });
  const docs = (s.media?.filter(m=>m.type==="doc")||[]).slice(0,1); // max 1 document

  useEffect(()=>{
    if(playingVideo===null){ setVideoProgress(0); return; }
    const iv = setInterval(()=>setVideoProgress(p=>{
      if(p>=100){ setPlayingVideo(null); return 0; }
      return p+1.5;
    }), 200);
    return ()=>clearInterval(iv);
  },[playingVideo]);

  const SUP_TABS=[
    {id:"products",label:`📦 ${t("products_tab")} (${s.products.length})`},
    {id:"videos",  label:`🎬 Vídeo DIM${videos.length>0?` (${videos.length})`:""}`},
    {id:"docs",    label:`📋 ${t("catalogue_tab")}`},
  ];
  const docIcon ={PDF:"📄",DOCX:"📝",XLS:"📊",XLSX:"📊",ZIP:"🗜️"};
  const docColor={PDF:"#E05C6A",DOCX:"#2E75B6",XLS:"#27AE60",XLSX:"#27AE60",ZIP:"#8FA5B5"};

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",color:C.teal,fontWeight:600,marginBottom:16,fontSize:13}}>
        <Icon d={ic.back} size={16} color={C.teal}/> Voltar ao catálogo
      </button>

      {/* Supplier header */}
      <div style={{...card(C,{borderTop:`4px solid ${s.color}`,marginBottom:16})}}>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:10}}>
          <div style={{width:52,height:52,borderRadius:14,background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{s.icon}</div>
          <div style={{flex:1}}><div style={{fontWeight:800,fontSize:16,color:C.text}}>{s.name}</div><span style={tag(s.color)}>{s.cat}</span></div>
        </div>
        <div style={{fontSize:13,color:C.sub,lineHeight:1.6,marginBottom:12}}>{s.desc}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>triggerSupFb("contact")} style={{...btn(C,"primary",true),background:supFb==="contact"?C.emerald:s.color}}>
            {supFb==="contact"?"✓ Mensagem enviada!":"✉️ "+t("contact")}
          </button>
          <button onClick={()=>triggerSupFb("quote")} style={{...btn(C,"outline",true),borderColor:supFb==="quote"?C.emerald:undefined,color:supFb==="quote"?C.emerald:undefined}}>
            {supFb==="quote"?"✓ Pedido enviado!":"📄 Pedir orçamento"}
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{display:"flex",gap:0,background:C.bg,borderRadius:10,padding:4,marginBottom:16,overflowX:"auto"}}>
        {SUP_TABS.map(tb=>(
          <button key={tb.id} onClick={()=>setSupTab(tb.id)}
            style={{flex:"1 0 auto",padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:supTab===tb.id?700:500,fontSize:isMobile?11:12.5,background:supTab===tb.id?C.surface:"transparent",color:supTab===tb.id?C.teal:C.sub,boxShadow:supTab===tb.id?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all .15s",whiteSpace:"nowrap"}}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS ── */}
      {supTab==="products"&&(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:12}}>
          {s.products.map((p,i)=>(
            <div key={i} style={{...card(C,{marginBottom:0}),border:`1px solid ${s.color}22`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontWeight:700,fontSize:13,color:C.text,flex:1}}>{p.name}</div>
                <span style={{fontSize:10,color:C.sub,flexShrink:0,marginLeft:8}}>Ref: {p.ref}</span>
              </div>
              <div style={{fontSize:11,color:C.sub,lineHeight:1.5,marginBottom:10}}>{p.desc}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><span style={{fontWeight:800,fontSize:16,color:s.color}}>{p.price}</span><span style={{fontSize:10,color:C.sub,marginLeft:4}}>{p.unit}</span></div>
                <button onClick={()=>triggerSupFb("order_"+p.ref)} style={{...btn(C,"primary",true),background:supFb===("order_"+p.ref)?C.emerald:s.color,fontSize:11}}>{supFb===("order_"+p.ref)?"✓ Pedido!":t("order")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── VIDEOS ── */}
      {supTab==="videos"&&(
        <div>
          {videos.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"30px 0",fontSize:14}}>Sem vídeo DIM disponível.<div style={{fontSize:12,marginTop:6}}>Os vídeos DIM têm no máximo 5 minutos.</div></div>}
          {/* Featured video */}
          {videos.filter(v=>v.highlight).map((v,i)=>(
            <div key={i} style={{...card(C,{marginBottom:16}),border:`2px solid ${s.color}44`}}>
              <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
                <span style={tag(s.color)}>⭐ Destaque</span>
                <span style={{fontSize:11,color:C.sub}}>{v.date}</span>
              </div>
              <div onClick={()=>setPlayingVideo(playingVideo===i?null:i)}
                style={{height:isMobile?170:220,background:`linear-gradient(135deg,#0F1923,${s.color}55,#0F1923)`,borderRadius:10,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",overflow:"hidden"}}>
                <span style={{fontSize:isMobile?48:64}}>{v.thumb}</span>
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
                  <div style={{width:isMobile?52:64,height:isMobile?52:64,borderRadius:"50%",background:"rgba(255,255,255,0.92)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?22:28,boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
                    {playingVideo===i?"⏸":"▶️"}
                  </div>
                  {playingVideo!==i&&<span style={{color:"rgba(255,255,255,0.85)",fontSize:11,fontWeight:600}}>🎬 {v.duration}</span>}
                </div>
                {playingVideo===i&&(
                  <div style={{position:"absolute",bottom:0,left:0,right:0}}>
                    <div style={{height:3,background:"rgba(255,255,255,0.2)"}}><div style={{width:`${videoProgress}%`,height:"100%",background:s.color,transition:"width .2s"}}/></div>
                    <div style={{background:"rgba(0,0,0,0.6)",padding:"4px 12px",fontSize:10,color:"rgba(255,255,255,0.8)"}}>A reproduzir… {v.duration}</div>
                  </div>
                )}
                <div style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.5)",color:"#fff",borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:600}}>{v.duration}</div>
              </div>
              <div style={{fontWeight:700,fontSize:isMobile?13:15,color:C.text,marginBottom:6}}>{v.title}</div>
              <div style={{fontSize:12,color:C.sub,lineHeight:1.6}}>{v.desc}</div>
            </div>
          ))}
          {/* Other videos */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {videos.filter(v=>!v.highlight).map((v,idx)=>{
              const vidIdx = videos.findIndex(x=>x===v);
              return (
                <div key={idx} style={{...card(C,{marginBottom:0}),display:"flex",gap:14,alignItems:"center"}}>
                  <div onClick={()=>setPlayingVideo(playingVideo===vidIdx?null:vidIdx)}
                    style={{width:isMobile?70:90,height:isMobile?50:64,borderRadius:10,background:`linear-gradient(135deg,#0F1923,${s.color}55)`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,position:"relative",overflow:"hidden"}}>
                    <span style={{fontSize:isMobile?20:26}}>{v.thumb}</span>
                    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:isMobile?16:20}}>{playingVideo===vidIdx?"⏸":"▶️"}</span>
                    </div>
                    {playingVideo===vidIdx&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"rgba(255,255,255,0.2)"}}><div style={{width:`${videoProgress}%`,height:"100%",background:s.color,transition:"width .2s"}}/></div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:12,color:C.text,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div>
                    <div style={{fontSize:11,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{v.desc}</div>
                    <div style={{fontSize:10,color:C.sub}}>🎬 {v.duration} · {v.date}</div>
                  </div>
                  <button onClick={()=>setPlayingVideo(playingVideo===vidIdx?null:vidIdx)}
                    style={{...btn(C,"outline",true),fontSize:11,flexShrink:0}}>
                    {playingVideo===vidIdx?"⏸":"▶"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {supTab==="docs"&&(
        <div>
          {docs.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"30px 0",fontSize:14}}>Sem catálogo ou preçário disponível de momento.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {docs.map((d,i)=>(
              <div key={i} style={{...card(C,{marginBottom:0}),display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:48,height:48,borderRadius:12,background:(docColor[d.ext]||C.sub)+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                  {docIcon[d.ext]||"📎"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:3}}>{d.title}</div>
                  <div style={{fontSize:11,color:C.sub,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.desc}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{...tag(docColor[d.ext]||C.sub),fontSize:10}}>{d.ext}</span>
                    <span style={{fontSize:10,color:C.sub}}>{d.size}</span>
                    {d.pages&&<span style={{fontSize:10,color:C.sub}}>{d.pages}</span>}
                    <span style={{fontSize:10,color:C.sub}}>{d.date}</span>
                  </div>
                </div>
                <button onClick={()=>triggerSupFb("dl_"+d.ref)} aria-label={`Descarregar ${d.title}`}
                  style={{...btn(C,"primary",true),background:supFb===("dl_"+d.ref)?C.emerald:s.color,fontSize:11,flexShrink:0}}>
                  {supFb===("dl_"+d.ref)?"✓":"⬇️"}{!isMobile&&(supFb===("dl_"+d.ref)?" Descarregado":" Descarregar")}
                </button>
              </div>
            ))}
          </div>
          {/* Upload CTA — 1 doc limit */}
          <div style={{...card(C,{marginTop:14,marginBottom:0}),border:`2px dashed ${C.border}`,textAlign:"center",padding:"20px 18px"}}>
            <div style={{fontSize:28,marginBottom:6}}>📤</div>
            <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>Área reservada ao fornecedor</div>
            <div style={{fontSize:12,color:C.sub,marginBottom:4}}>Carregue o seu catálogo ou preçário (máx. 1 documento)</div>
            {docs.length>=1
              ? <div style={{fontSize:11,color:C.rose,marginBottom:12,fontWeight:600}}>⚠️ Limite atingido — substitua o documento existente para carregar um novo</div>
              : <div style={{fontSize:11,color:C.sub,marginBottom:12}}>Formatos aceites: PDF, DOCX, XLS, XLSX</div>
            }
            {/* Hidden upload input triggered via ref */}
            <input ref={uploadRef} type="file" accept=".pdf,.docx,.xls,.xlsx"
              style={{position:"fixed",top:-9999,left:-9999,width:1,height:1,opacity:0}}
              onChange={e=>{if(e.target.files?.[0])triggerSupFb("upload");e.target.value="";}}/>
            <button onClick={()=>uploadRef.current?.click()}
              style={{...btn(C,"outline",true),borderColor:s.color,color:s.color,fontSize:12}}>
              {docs.length>=1?"🔄 Substituir documento":"📤 Carregar catálogo/preçário"}
            </button>
            {supFb==="upload"&&<div style={{fontSize:11,color:C.emerald,marginTop:8,fontWeight:600}}>✓ Documento carregado com sucesso!</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const computeJobMatch = (job, me) => {
  const haystack = `${job.title} ${job.company} ${job.description||""}`.toLowerCase();
  const interests = [...(me?.interests||[]), me?.spec].filter(Boolean);
  const hits = interests.filter(i=>haystack.includes(i.toLowerCase())).length;
  return Math.min(95, 55 + hits*15);
};
const mapJobRow = (row, me) => ({
  id: row.id,
  title: row.title,
  company: row.company,
  type: row.type,
  loc: row.loc,
  salary: row.salary,
  posted: timeAgo(row.created_at),
  urgent: row.urgent,
  match: computeJobMatch(row, me),
});

function Market({ C, t, isMobile, me }) {
  const [sub, setSub] = useState("marketplace");
  const [priceMax, setPriceMax] = useState(1000000);
  const [selSupplier, setSelSupplier] = useState(null);
  const [jobSearch, setJobSearch] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobQuery, setJobQuery] = useState({text:"",loc:""});
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [marketVisible, setMarketVisible] = useState(4);
  const [jobsVisible, setJobsVisible] = useState(3);
  const [contactItem, setContactItem] = useState(null);
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [mktFb, triggerMktFb] = useFeedback();
  const [savedJobs, setSavedJobs] = useState([]);
  const [newAdOpen, setNewAdOpen] = useState(false);
  const [newAd, setNewAd] = useState({title:"",cat:"Equipamento",price:"",cond:"Novo",loc:"",desc:"",img:""});
  const [marketItems, setMarketItems] = useState(MARKET_ITEMS);
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [newJob, setNewJob] = useState({title:"",company:"",type:"Full-time",loc:"",salary:"",desc:""});
  const [jobItems, setJobItems] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const EMOJI_MAP = {"Equipamento":"🔬","Negócio":"🏥","Stock":"💊"};
  const CONDITIONS = ["Novo","Usado - Ótimo","Usado - Bom","Usado - Razoável","Em funcionamento"];
  const CATEGORIES = ["Equipamento","Negócio","Stock"];
  const catC={"Equipamento":C.teal,"Negócio":C.purple,"Stock":C.emerald};
  const SUBS=[{id:"marketplace",label:"🛒 "+t("marketplace")},{id:"jobs",label:"💼 "+t("jobs")},{id:"suppliers",label:"📋 "+t("suppliers")}];
  const filteredJobs = jobItems.filter(j=>{
    const matchText=!jobQuery.text||j.title.toLowerCase().includes(jobQuery.text.toLowerCase())||j.company.toLowerCase().includes(jobQuery.text.toLowerCase());
    const matchLoc=!jobQuery.loc||j.loc.toLowerCase().includes(jobQuery.loc.toLowerCase());
    return matchText&&matchLoc;
  });

  const loadJobs = async () => {
    const { data, error } = await supabase.from("jobs").select("*").order("created_at",{ascending:false}).limit(50);
    if(error){ console.error(error); setJobsLoading(false); return; }
    setJobItems((data||[]).map(row=>mapJobRow(row, me)));
    setJobsLoading(false);
  };
  useEffect(() => { loadJobs(); }, []);

  useEffect(() => {
    const loadSavedJobs = async () => {
      const { data, error } = await supabase.from("saved_jobs").select("job_id").eq("user_id", me.id);
      if(error){ console.error(error); return; }
      setSavedJobs((data||[]).map(r=>r.job_id));
    };
    loadSavedJobs();
  }, [me.id]);

  const toggleSaveJob = async (jobId) => {
    const isSaved = savedJobs.includes(jobId);
    setSavedJobs(s=>isSaved?s.filter(x=>x!==jobId):[...s,jobId]);
    const { error } = isSaved
      ? await supabase.from("saved_jobs").delete().eq("job_id", jobId).eq("user_id", me.id)
      : await supabase.from("saved_jobs").insert({ job_id: jobId, user_id: me.id });
    if(error) console.error(error);
  };

  const createJob = async () => {
    if(!newJob.title.trim()||!newJob.company.trim()||!newJob.loc.trim()){
      alert("Por favor preencha título, empresa e localização.");
      return;
    }
    const { data, error } = await supabase.from("jobs").insert({
      author_id: me.id,
      title: newJob.title.trim(),
      company: newJob.company.trim(),
      type: newJob.type,
      loc: newJob.loc.trim(),
      salary: newJob.salary.trim()||"A definir",
      description: newJob.desc.trim(),
    }).select().single();
    if(error){ console.error(error); alert("Erro ao publicar vaga: "+error.message); return; }
    setJobItems(prev=>[mapJobRow(data, me), ...prev]);
    setJobsVisible(v=>v+1);
    setNewJob({title:"",company:"",type:"Full-time",loc:"",salary:"",desc:""});
    setNewJobOpen(false);
  };

  const generateReport = async () => {
    setReportLoading(true); setReportOpen(true); setReportText("");
    const today = new Date().toLocaleDateString("pt-PT",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
    const criteria = [jobQuery.text&&`Área: "${jobQuery.text}"`, jobQuery.loc&&`Localização: "${jobQuery.loc}"`].filter(Boolean).join(" · ") || "Todas as áreas e localizações";
    const jobList = filteredJobs.map((j,i)=>`${i+1}. ${j.title} | ${j.company} | ${j.loc} | ${j.salary} | Match: ${j.match}%${j.urgent?" | 🔥 URGENTE":""}`).join("\n");
    const prompt = `És um assistente especializado em recrutamento veterinário. Gera um relatório diário de vagas de emprego em Português de Portugal, profissional, bem estruturado e fácil de ler.

Data: ${today}
Critérios de pesquisa: ${criteria}
Total de vagas encontradas: ${filteredJobs.length}

Lista de vagas:
${jobList || "Nenhuma vaga encontrada para os critérios seleccionados."}

Cria um relatório com:
1. Resumo executivo (2-3 frases sobre o mercado de emprego veterinário com base nas vagas encontradas)
2. Destaques do dia (vagas mais relevantes, urgentes ou com melhor match)
3. Análise por tipo de contrato e localização
4. Tendências salariais observadas
5. Recomendação de acção para o utilizador
6. Nota de rodapé com data e critérios usados

Tom: profissional, directo, útil. Usa emojis com moderação para facilitar a leitura.`;

    try {
      const res = await fetch("/api/jobs-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria, jobCount: filteredJobs.length, jobList })
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if(data.error) throw new Error(data.error);
      setReportText(data.report || "Sem conteúdo.");
    } catch(err) {
      setReportText(`❌ Erro ao gerar relatório: ${err.message}`);
    } finally {
      setReportLoading(false);
    }
  };
  const [marketLocSearch, setMarketLocSearch] = useState("");
  const [marketLocQuery, setMarketLocQuery] = useState("");
  const filteredMarket = marketItems.filter(item=>
    !marketLocQuery||item.loc.toLowerCase().includes(marketLocQuery.toLowerCase())||item.seller.toLowerCase().includes(marketLocQuery.toLowerCase())
  );
  const filteredSuppliers = SUPPLIERS.filter(s=>
    !supplierQuery||s.name.toLowerCase().includes(supplierQuery.toLowerCase())||s.cat.toLowerCase().includes(supplierQuery.toLowerCase())||s.products.some(p=>p.name.toLowerCase().includes(supplierQuery.toLowerCase()))
  );

  return (
    <div>
      <div style={{display:"flex",gap:0,background:C.bg,borderRadius:10,padding:4,marginBottom:18,overflowX:"auto"}}>
        {SUBS.map(s=><button key={s.id} onClick={()=>setSub(s.id)} style={{flex:"1 0 auto",padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:sub===s.id?700:500,fontSize:isMobile?11:12.5,background:sub===s.id?C.surface:"transparent",color:sub===s.id?C.teal:C.sub,boxShadow:sub===s.id?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all .15s",whiteSpace:"nowrap"}}>{s.label}</button>)}
      </div>

      {sub==="marketplace"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text}}>Marketplace Veterinário</div>
            <button onClick={()=>setNewAdOpen(v=>!v)} style={{...btn(C,newAdOpen?"outline":"primary",isMobile),borderColor:newAdOpen?C.rose:undefined,color:newAdOpen?C.rose:undefined}}>
              {newAdOpen?"✕ Cancelar":"+ "+t("marketplace")}
            </button>
          </div>

          {/* ── New Ad Form ──────────────────────────────────────────────── */}
          {newAdOpen&&(
            <div style={{...card(C),border:`2px solid ${C.teal}`,marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:15,color:C.teal,marginBottom:16}}>📢 Criar Anúncio</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>TÍTULO DO ANÚNCIO *</label>
                  <input value={newAd.title} onChange={e=>setNewAd(p=>({...p,title:e.target.value}))}
                    placeholder="ex: Ecógrafo Esaote MyLab 30" style={{...inp(C),fontSize:13}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>CATEGORIA *</label>
                  <select value={newAd.cat} onChange={e=>setNewAd(p=>({...p,cat:e.target.value,img:EMOJI_MAP[e.target.value]||"📦"}))}
                    style={{...inp(C),fontSize:13}}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>PREÇO *</label>
                  <input value={newAd.price} onChange={e=>setNewAd(p=>({...p,price:e.target.value}))}
                    placeholder="ex: €2.500" style={{...inp(C),fontSize:13}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>CONDIÇÃO</label>
                  <select value={newAd.cond} onChange={e=>setNewAd(p=>({...p,cond:e.target.value}))}
                    style={{...inp(C),fontSize:13}}>
                    {CONDITIONS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>LOCALIZAÇÃO *</label>
                  <input value={newAd.loc} onChange={e=>setNewAd(p=>({...p,loc:e.target.value}))}
                    placeholder="ex: Lisboa" style={{...inp(C),fontSize:13}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>EMOJI / ÍCONE</label>
                  <input value={newAd.img} onChange={e=>setNewAd(p=>({...p,img:e.target.value}))}
                    placeholder={EMOJI_MAP[newAd.cat]||"📦"} maxLength={2}
                    style={{...inp(C),fontSize:20,textAlign:"center",width:60}}/>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>DESCRIÇÃO</label>
                <textarea value={newAd.desc} onChange={e=>setNewAd(p=>({...p,desc:e.target.value}))}
                  placeholder="Descreva o equipamento, estado, motivo de venda, informação adicional relevante…"
                  rows={3} style={{...inp(C),fontSize:13,resize:"vertical"}}/>
              </div>

              {/* Preview */}
              {newAd.title&&(
                <div style={{background:C.bg,borderRadius:10,padding:12,marginBottom:14,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:8}}>PRÉ-VISUALIZAÇÃO</div>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <div style={{width:48,height:48,background:C.surface,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                      {newAd.img||EMOJI_MAP[newAd.cat]||"📦"}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13,color:C.text}}>{newAd.title||"Título do anúncio"}</div>
                      <div style={{fontSize:11,color:C.sub}}>📍 {newAd.loc||"Localização"} · {newAd.cond}</div>
                      <div style={{fontWeight:800,fontSize:15,color:C.teal,marginTop:2}}>{newAd.price||"€ —"}</div>
                    </div>
                    <span style={tag(catC[newAd.cat]||C.sub)}>{newAd.cat}</span>
                  </div>
                </div>
              )}

              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button onClick={()=>{setNewAdOpen(false);setNewAd({title:"",cat:"Equipamento",price:"",cond:"Novo",loc:"",desc:"",img:""}); }} style={btn(C,"outline",true)}>Cancelar</button>
                <button
                  onClick={()=>{
                    if(!newAd.title.trim()||!newAd.price.trim()||!newAd.loc.trim()){
                      alert("Por favor preencha título, preço e localização.");
                      return;
                    }
                    const item = {
                      id: Date.now(),
                      title: newAd.title.trim(),
                      cat: newAd.cat,
                      price: newAd.price.trim(),
                      cond: newAd.cond,
                      loc: newAd.loc.trim(),
                      seller: "Dra. Ana Ferreira",
                      img: newAd.img||EMOJI_MAP[newAd.cat]||"📦",
                      rating: 5.0,
                      verified: true,
                      desc: newAd.desc,
                    };
                    setMarketItems(prev=>[item,...prev]);
                    setMarketVisible(v=>v+1);
                    setNewAd({title:"",cat:"Equipamento",price:"",cond:"Novo",loc:"",desc:"",img:""});
                    setNewAdOpen(false);
                  }}
                  disabled={!newAd.title.trim()||!newAd.price.trim()||!newAd.loc.trim()}
                  style={{...btn(C,"primary",true),opacity:(!newAd.title.trim()||!newAd.price.trim()||!newAd.loc.trim())?0.5:1}}>
                  📢 Publicar Anúncio
                </button>
              </div>
            </div>
          )}
          <div style={{...card(C,{marginBottom:14,padding:"14px 16px"})}}>
            <div style={{fontWeight:700,fontSize:12,color:C.sub,marginBottom:10}}>FILTROS</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
              <div>
                <label style={{fontSize:11,color:C.sub,display:"block",marginBottom:4}}>Preço máximo</label>
                <input type="range" min={0} max={1000000} step={5000} value={priceMax} onChange={e=>setPriceMax(Number(e.target.value))} style={{width:"100%"}}/>
                <div style={{fontSize:11,color:C.teal,fontWeight:700}}>
                  {priceMax>=1000000?"Sem limite":priceMax>=1000?`€${(priceMax/1000).toFixed(0)}k`:`€${priceMax.toLocaleString()}`}
                </div>
              </div>
              <div><label style={{fontSize:11,color:C.sub,display:"block",marginBottom:4}}>Condição</label>
                <select style={{...inp(C),fontSize:12,padding:"6px 10px"}}>{["Todos","Novo","Usado - Ótimo","Usado - Bom"].map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={{fontSize:11,color:C.sub,display:"block",marginBottom:4}}>Localização</label>
                <SearchBar
                  value={marketLocSearch}
                  onChange={v=>{setMarketLocSearch(v);setMarketLocQuery(v);}}
                  onSearch={v=>{setMarketLocSearch(v);setMarketLocQuery(v);}}
                  placeholder="Lisboa, Porto…"
                  C={C}
                /></div>
              <div><label style={{fontSize:11,color:C.sub,display:"block",marginBottom:4}}>Categoria</label>
                <select style={{...inp(C),fontSize:12,padding:"6px 10px"}}>{["Todos","Equipamento","Negócio","Stock"].map(c=><option key={c}>{c}</option>)}</select></div>
            </div>
          </div>
          {marketLocQuery&&filteredMarket.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>Sem anúncios em "{marketLocQuery}".</div>}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:14}}>
            {filteredMarket.slice(0,marketVisible).map(item=>(
              <div key={item.id} style={card(C,{marginBottom:0})}>
                <div style={{height:isMobile?80:100,background:C.bg,borderRadius:10,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?38:48}}>{item.img}</div>
                <div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={tag(catC[item.cat]||C.sub)}>{item.cat}</span>
                  <span style={tag(C.sub)}>{item.cond}</span>
                  {item.verified&&<span style={tag(C.emerald)}>✅ Verificado</span>}
                </div>
                <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text,marginBottom:4}}>{item.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                  <Icon d={ic.star} size={12} color={C.gold}/><span style={{fontSize:12,color:C.text,fontWeight:600}}>{item.rating}</span>
                </div>
                <div style={{fontSize:11,color:C.sub,marginBottom:12}}>📍 {item.loc} · {item.seller}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <div style={{fontWeight:800,fontSize:17,color:C.teal}}>{item.price}</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{setContactItem(item);setContactMsg(`Olá! Tenho interesse no anúncio "${item.title}" (${item.price}). Ainda está disponível?`);setContactSent(false);}} style={btn(C,"outline",true)}>💬 {t("contact")}</button>
                    <button onClick={()=>triggerMktFb("vermais_"+item.id)} style={btn(C,"primary",true)}>{mktFb===("vermais_"+item.id)?"↗️ A abrir…":"Ver mais"}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {marketVisible<filteredMarket.length&&(
            <button onClick={()=>setMarketVisible(c=>c+4)} style={{...btn(C,"outline"),width:"100%",justifyContent:"center",marginTop:14}}>
              {t("load_more")} ({filteredMarket.length-marketVisible} restantes)
            </button>
          )}
        </div>
      )}

      {sub==="jobs"&&(
        <div>
          {/* Report Modal */}
          {reportOpen&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setReportOpen(false)}>
              <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:620,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.25)",border:`1px solid ${C.border}`}}>
                {/* Modal header */}
                <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${C.teal},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📊</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:15,color:C.text}}>Relatório Diário de Vagas</div>
                    <div style={{fontSize:11,color:C.sub}}>{new Date().toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {reportText&&!reportLoading&&(
                      <button onClick={()=>{navigator.clipboard?.writeText(reportText);}}
                        style={{...btn(C,"outline",true),fontSize:11}}>📋 Copiar</button>
                    )}
                    <button onClick={()=>setReportOpen(false)} aria-label="Fechar relatório" style={{background:"none",border:"none",cursor:"pointer",color:C.sub,fontSize:20,padding:4}}>✕</button>
                  </div>
                </div>
                {/* Modal body */}
                <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
                  {reportLoading?(
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:"40px 0"}}>
                      <div style={{fontSize:40}}>📊</div>
                      <div style={{fontWeight:700,fontSize:14,color:C.text}}>A gerar relatório com IA…</div>
                      <div style={{fontSize:12,color:C.sub,textAlign:"center",maxWidth:280}}>A analisar {filteredJobs.length} {filteredJobs.length===1?"vaga":"vagas"} e a preparar o relatório personalizado</div>
                      <div style={{width:200,height:4,background:C.border,borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",background:`linear-gradient(90deg,${C.teal},${C.purple})`,borderRadius:4,animation:"loadBar 1.5s ease-in-out infinite"}}/>
                        <style>{`@keyframes loadBar{0%{width:0%}50%{width:70%}100%{width:100%}}`}</style>
                      </div>
                    </div>
                  ):(
                    <div style={{fontSize:13,color:C.text,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{reportText}</div>
                  )}
                </div>
                {/* Modal footer */}
                {!reportLoading&&reportText&&(
                  <div style={{padding:"14px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:10,flexShrink:0}}>
                    <button onClick={generateReport} style={{...btn(C,"outline",true),fontSize:12}}>🔄 Regenerar</button>
                    <button onClick={()=>{
                      const blob=new Blob([reportText],{type:"text/plain;charset=utf-8"});
                      const url=URL.createObjectURL(blob);
                      const a=document.createElement("a"); a.href=url;
                      a.download=`relatorio_vagas_${new Date().toISOString().slice(0,10)}.txt`;
                      a.click(); URL.revokeObjectURL(url);
                    }} style={{...btn(C,"primary",true),fontSize:12}}>⬇️ Descarregar</button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text}}>Emprego Veterinário</div>
            <div style={{display:"flex",gap:6}}>
              {!isMobile&&<button onClick={()=>triggerMktFb("cv")} style={btn(C,"outline",true)}>{mktFb==="cv"?"✓ CV enviado!":"📋 "+t("publish_cv")}</button>}
              <button onClick={generateReport} style={{...btn(C,"outline",true),borderColor:C.purple,color:C.purple}}>
                📊 {isMobile?"Relatório":"Relatório Diário"}
              </button>
              <button onClick={()=>setNewJobOpen(v=>!v)} style={{...btn(C,newJobOpen?"outline":"primary",isMobile),borderColor:newJobOpen?C.rose:undefined,color:newJobOpen?C.rose:undefined}}>
                {newJobOpen?"✕ Cancelar":"+ Vaga"}
              </button>
            </div>
          </div>

          {/* ── New Job Form ──────────────────────────────────────────────── */}
          {newJobOpen&&(
            <div style={{...card(C),border:`2px solid ${C.teal}`,marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:15,color:C.teal,marginBottom:16}}>💼 Publicar Vaga de Emprego</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                <div style={{gridColumn:isMobile?"1":"1 / -1"}}>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>TÍTULO DA VAGA *</label>
                  <input value={newJob.title} onChange={e=>setNewJob(p=>({...p,title:e.target.value}))}
                    placeholder="ex: Médico(a) Veterinário(a) de Medicina Interna" style={{...inp(C),fontSize:13}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>EMPRESA / CLÍNICA *</label>
                  <input value={newJob.company} onChange={e=>setNewJob(p=>({...p,company:e.target.value}))}
                    placeholder="ex: Hospital Veterinário Central" style={{...inp(C),fontSize:13}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>TIPO DE CONTRATO</label>
                  <select value={newJob.type} onChange={e=>setNewJob(p=>({...p,type:e.target.value}))}
                    style={{...inp(C),fontSize:13}}>
                    {["Full-time","Part-time","Freelance","Investigação","Estágio"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>LOCALIZAÇÃO *</label>
                  <input value={newJob.loc} onChange={e=>setNewJob(p=>({...p,loc:e.target.value}))}
                    placeholder="ex: Lisboa, Porto, Nacional…" style={{...inp(C),fontSize:13}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>SALÁRIO / REMUNERAÇÃO</label>
                  <input value={newJob.salary} onChange={e=>setNewJob(p=>({...p,salary:e.target.value}))}
                    placeholder="ex: €2.500–€3.200/mês" style={{...inp(C),fontSize:13}}/>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>DESCRIÇÃO DA VAGA</label>
                <textarea value={newJob.desc} onChange={e=>setNewJob(p=>({...p,desc:e.target.value}))}
                  placeholder="Requisitos, responsabilidades, benefícios, condições de candidatura…"
                  rows={3} style={{...inp(C),fontSize:13,resize:"vertical"}}/>
              </div>

              {/* Preview */}
              {newJob.title&&newJob.company&&(
                <div style={{background:C.bg,borderRadius:10,padding:12,marginBottom:14,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:8}}>PRÉ-VISUALIZAÇÃO</div>
                  <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>{newJob.title}</div>
                  <div style={{fontSize:12,color:C.sub,marginBottom:6}}>{newJob.company}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={tag(C.sub)}>📍 {newJob.loc||"Localização"}</span>
                    <span style={tag(C.teal)}>{newJob.type}</span>
                    {newJob.salary&&<span style={{fontSize:11,color:C.teal,fontWeight:700}}>{newJob.salary}</span>}
                  </div>
                </div>
              )}

              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button onClick={()=>{setNewJobOpen(false);setNewJob({title:"",company:"",type:"Full-time",loc:"",salary:"",desc:""}); }} style={btn(C,"outline",true)}>Cancelar</button>
                <button
                  onClick={createJob}
                  disabled={!newJob.title.trim()||!newJob.company.trim()||!newJob.loc.trim()}
                  style={{...btn(C,"primary",true),opacity:(!newJob.title.trim()||!newJob.company.trim()||!newJob.loc.trim())?0.5:1}}>
                  💼 Publicar Vaga
                </button>
              </div>
            </div>
          )}

          <div style={{background:`linear-gradient(135deg,${C.teal},${C.purple})`,borderRadius:12,padding:"14px 18px",color:"#fff",marginBottom:16,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div style={{fontSize:28}}>🤖</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14}}>VetMatch — Matching Inteligente</div>
              <div style={{fontSize:12,opacity:0.85}}>2 vagas com {">"}80% de compatibilidade com o seu perfil</div>
            </div>
            <button onClick={()=>setJobsVisible(j=>j+10)} style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0}}>Ver matches</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:14}}>
            <SearchBar
              value={jobSearch}
              onChange={v=>{setJobSearch(v);setJobQuery(q=>({...q,text:v}));}}
              onSearch={v=>{setJobSearch(v);setJobQuery(q=>({...q,text:v}));}}
              placeholder="🔍 Pesquisar vagas…"
              C={C}
            />
            {!isMobile&&<SearchBar
              value={jobLocation}
              onChange={v=>{setJobLocation(v);setJobQuery(q=>({...q,loc:v}));}}
              onSearch={v=>{setJobLocation(v);setJobQuery(q=>({...q,loc:v}));}}
              placeholder="📍 Localização…"
              C={C}
            />}
          </div>
          {jobsLoading&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>A carregar vagas…</div>}
          {!jobsLoading&&filteredJobs.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>Sem vagas para os critérios seleccionados.</div>}
          {/* Report context bar */}
          {filteredJobs.length>0&&(
            <div style={{background:C.purple+"12",border:`1px solid ${C.purple}30`,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:16}}>📊</span>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontSize:12,color:C.text,fontWeight:600}}>{filteredJobs.length} {filteredJobs.length===1?"vaga encontrada":"vagas encontradas"}</span>
                {(jobQuery.text||jobQuery.loc)&&<span style={{fontSize:11,color:C.sub}}> · {[jobQuery.text&&`"${jobQuery.text}"`,jobQuery.loc&&`📍 ${jobQuery.loc}`].filter(Boolean).join(" + ")}</span>}
              </div>
              <button onClick={generateReport}
                style={{background:C.purple,color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                📊 Gerar Relatório
              </button>
            </div>
          )}
          {filteredJobs.slice(0,jobsVisible).map(j=>(
            <div key={j.id} style={card(C)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                    <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text}}>{j.title}</div>
                    {j.urgent&&<span style={tag(C.rose)}>🔥 Urgente</span>}
                    <span style={{fontSize:10,background:j.match>=80?C.emerald+"20":C.amber+"20",color:j.match>=80?C.emerald:C.amber,borderRadius:20,padding:"2px 8px",fontWeight:700}}>🤖 {j.match}%</span>
                  </div>
                  <div style={{fontSize:12,color:C.sub}}>{j.company}</div>
                  <div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap"}}>
                    <span style={tag(C.sub)}>📍 {j.loc}</span>
                    <span style={tag(C.teal)}>{j.type}</span>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:700,color:C.teal,fontSize:isMobile?12:13}}>{j.salary}</div>
                  <div style={{fontSize:10,color:C.sub}}>{j.posted}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6,marginTop:12}}>
                <button onClick={()=>toggleSaveJob(j.id)}
                  style={{...btn(C,savedJobs.includes(j.id)?"primary":"outline",true),background:savedJobs.includes(j.id)?C.amber:undefined}}>
                  {savedJobs.includes(j.id)?"★ Guardado":t("save")}
                </button>
                <button onClick={()=>triggerMktFb("apply_"+j.id)}
                  style={{...btn(C,"primary",true),background:mktFb===("apply_"+j.id)?C.emerald:C.teal}}>
                  {mktFb===("apply_"+j.id)?"✓ Candidatura enviada!":t("apply")}
                </button>
              </div>
            </div>
          ))}
          {jobsVisible<filteredJobs.length&&(
            <button onClick={()=>setJobsVisible(c=>c+3)} style={{...btn(C,"outline"),width:"100%",justifyContent:"center",marginTop:4}}>
              {t("load_more")} ({filteredJobs.length-jobsVisible} restantes)
            </button>
          )}
        </div>
      )}

      {sub==="suppliers"&&(
        selSupplier?<SupplierDetail s={SUPPLIERS.find(x=>x.id===selSupplier)} C={C} t={t} isMobile={isMobile} onBack={()=>setSelSupplier(null)}/>:(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text}}>Catálogos de Fornecedores</div>
              <button onClick={()=>triggerMktFb("supplier")} style={btn(C,"primary",isMobile)}>{mktFb==="supplier"?"✓ Formulário enviado!":"+ "+t("become_supplier")}</button>
            </div>
            <div style={{color:C.sub,fontSize:12,marginBottom:14}}>Consulte produtos, preçários e contacte directamente</div>
            <SearchBar
              value={supplierSearch}
              onChange={v=>{setSupplierSearch(v);setSupplierQuery(v);}}
              onSearch={v=>{setSupplierSearch(v);setSupplierQuery(v);}}
              placeholder="🔍 Pesquisar produtos ou fornecedores…"
              C={C}
              style={{marginBottom:12}}
            />
            {supplierQuery&&filteredSuppliers.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>Sem resultados para "{supplierQuery}".</div>}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:14}}>
              {filteredSuppliers.map(s=>(
                <div key={s.id} onClick={()=>setSelSupplier(s.id)}
                  style={{...card(C,{marginBottom:0}),cursor:"pointer",borderTop:`4px solid ${s.color}`}}>
                  <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
                    <div style={{width:46,height:46,borderRadius:12,background:s.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{s.icon}</div>
                    <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:C.text}}>{s.name}</div><span style={tag(s.color)}>{s.cat}</span></div>
                  </div>
                  <div style={{fontSize:12,color:C.sub,lineHeight:1.5,marginBottom:12}}>{s.desc}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:11,color:C.sub}}>{s.products.length} produtos</span>
                      {(s.media?.filter(m=>m.type==="video"&&Number((m.duration||"0:00").split(":")[0])<=5)||[]).length>0&&<span style={tag(C.rose)}>🎬 Vídeo DIM</span>}
                      {s.media?.some(m=>m.type==="doc")&&<span style={tag(C.teal)}>📋 Catálogo</span>}
                    </div>
                    <button style={{...btn(C,"primary",true),background:s.color,pointerEvents:"none",fontSize:11}}>Ver →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Item-scoped contact modal */}
      {contactItem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setContactItem(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:460,boxShadow:"0 8px 40px rgba(0,0,0,0.25)",border:`1px solid ${C.border}`}}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:24}}>{contactItem.img}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:14,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{contactItem.title}</div>
                <div style={{fontSize:11,color:C.sub}}>Contactar {contactItem.seller} · {contactItem.price}</div>
              </div>
              <button onClick={()=>setContactItem(null)} aria-label="Fechar contacto" style={{background:"none",border:"none",cursor:"pointer",color:C.sub,fontSize:20,padding:4}}>✕</button>
            </div>
            <div style={{padding:"18px 20px"}}>
              {contactSent?(
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{fontSize:36,marginBottom:10}}>✅</div>
                  <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Mensagem enviada!</div>
                  <div style={{fontSize:12,color:C.sub}}>{contactItem.seller} foi notificado e a conversa ficou associada a este anúncio.</div>
                  <button onClick={()=>setContactItem(null)} style={{...btn(C,"primary"),marginTop:16}}>Fechar</button>
                </div>
              ):(
                <>
                  <div style={{background:C.bg,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:11,color:C.sub,display:"flex",gap:6,alignItems:"center"}}>
                    🔗 Esta conversa fica associada ao anúncio "{contactItem.title}"
                  </div>
                  <textarea value={contactMsg} onChange={e=>setContactMsg(e.target.value)} rows={4}
                    style={{...inp(C),fontSize:13,resize:"vertical",marginBottom:14}}/>
                  <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                    <button onClick={()=>setContactItem(null)} style={btn(C,"outline",true)}>Cancelar</button>
                    <button onClick={()=>setContactSent(true)} disabled={!contactMsg.trim()}
                      style={{...btn(C,"primary",true),opacity:!contactMsg.trim()?0.5:1}}>📨 Enviar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// CLINIC (IA + Calculadora + Fármacos + Protocolos + Casos SOAP + Mapa)
// ══════════════════════════════════════════════════════════════════════════════
function CollapsibleSection({title,icon,C,children,defaultOpen=false}){
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={{border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:12}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:open?C.teal+"12":C.bg,border:"none",cursor:"pointer",textAlign:"left"}}>
        <span style={{fontSize:18}}>{icon}</span>
        <span style={{flex:1,fontWeight:700,fontSize:13,color:open?C.teal:C.text}}>{title}</span>
        <span style={{fontSize:18,color:C.sub,transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>⌄</span>
      </button>
      {open&&<div style={{padding:"14px 14px 6px",background:C.surface}}>{children}</div>}
    </div>
  );
}

// LabField defined outside AIDiagnosis to prevent remount on every parent render
function LabField({p, values, onChange, C}) {
  return (
    <div><label style={{fontSize:10,fontWeight:700,color:C.sub,display:"block",marginBottom:3}}>{p.label}</label>
      {p.type==="select"?
        <select value={values[p.key]||""} onChange={e=>onChange(p.key,e.target.value)} style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:9,padding:"6px 8px",fontSize:11,outline:"none",background:C.bg,color:C.text,boxSizing:"border-box"}}>
          <option value="">—</option>{p.options.map(o=><option key={o}>{o}</option>)}</select>:
        <input value={values[p.key]||""} onChange={e=>onChange(p.key,e.target.value)} placeholder={p.placeholder||""} style={{width:"100%",border:`1.5px solid ${C.border}`,borderRadius:9,padding:"6px 8px",fontSize:11,outline:"none",background:C.bg,color:C.text,boxSizing:"border-box"}}/>
      }</div>
  );
}

function AIDiagnosis({ C, t, isMobile }) {
  const [activeTab,setActiveTab]=useState("clinical");
  const [species,setSpecies]=useState(""); const [age,setAge]=useState(""); const [sex,setSex]=useState(""); const [breed,setBreed]=useState("");
  const [symptoms,setSymptoms]=useState([]); const [freeSymp,setFreeSymp]=useState(""); const [extra,setExtra]=useState("");
  const [hemo,setHemo]=useState({}); const [bio,setBio]=useState({}); const [hor,setHor]=useState({});
  const [urine,setUrine]=useState({}); const [feces,setFeces]=useState({});
  const [loading,setLoading]=useState(false); const [result,setResult]=useState(null); const [error,setError]=useState(null);
  const [history, setHistory] = usePersistentState("vc_ai_history", []);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareIds, setCompareIds] = useState([]);

  const toggleSym=s=>setSymptoms(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const countFilled=obj=>Object.values(obj).filter(v=>v&&v!=="").length;
  const labFilled=countFilled(hemo)+countFilled(bio)+countFilled(hor)+countFilled(urine)+countFilled(feces);

  const TABS=[
    {id:"clinical",label:"🩺 Clínico",badge:symptoms.length+(freeSymp?1:0)},
    {id:"blood",label:"🩸 Sangue",badge:countFilled(hemo)+countFilled(bio)+countFilled(hor)},
    {id:"urine",label:"💧 Urina",badge:countFilled(urine)},
    {id:"feces",label:"🔬 Fezes",badge:countFilled(feces)},
  ];

  const buildLabText=()=>{
    const parts=[];
    const fmt=(title,obj,params)=>{const f=params.filter(p=>obj[p.key]&&obj[p.key]!=="");if(f.length)parts.push(`${title}: `+f.map(p=>`${p.label.replace(/ \(.*\)/,"")}=${obj[p.key]}`).join(", "));};
    fmt("Hemograma",hemo,BLOOD_P.hem); fmt("Bioquímica",bio,BLOOD_P.bio); fmt("Hormonas",hor,BLOOD_P.hor);
    fmt("Urina",urine,URINE_P); fmt("Fezes",feces,FECES_P);
    return parts.join(" | ");
  };

  const run=async()=>{
    if(!species||(symptoms.length===0&&!freeSymp.trim()))return;
    setLoading(true); setResult(null); setError(null);

    const labText=buildLabText();
    const allSymp=[...symptoms,...(freeSymp.trim()?[freeSymp.trim()]:[])] .join(", ");

    // Shorter, tighter prompt to reduce parse failures
    const prompt=[
      "Veterinário especialista. Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.",
      `Caso: Espécie=${species}, Raça=${breed||"nd"}, Idade=${age||"nd"}, Sexo=${sex||"nd"}.`,
      `Sinais: ${allSymp}.`,
      extra ? `Anamnese: ${extra}.` : "",
      labText ? `Labs: ${labText}.` : "",
      "",
      'Formato JSON exacto (campos CURTOS, máx 2 frases cada):',
      '{"resumo":"...","urgencia":"Urgente|Semi-urgente|Eletivo","proximos_passos":"...","diagnosticos":[{"nome":"...","probabilidade":"Alta|Média|Baixa","justificacao":"...","testes":["..."],"tratamento_inicial":"..."}]}',
      "",
      "Devolva 4 diagnósticos. Respostas curtas e objectivas. Apenas JSON, nada mais."
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species, breed, age, sex, symptoms: allSymp, extra, labText })
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const e = await res.json(); msg = e?.error?.message || msg; } catch(_) {}
        throw new Error(msg);
      }

      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      if (!parsed.diagnosticos) throw new Error("Resposta inesperada do servidor.");
      setResult(parsed);

      // Save to history
      setHistory(prev => [{
        id: Date.now(),
        date: new Date().toLocaleString("pt-PT", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}),
        species, breed, age, sex,
        symptoms: allSymp,
        result: parsed,
      }, ...prev].slice(0, 20));

    } catch (err) {
      setError(err.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  const probC=p=>p==="Alta"?C.rose:p==="Média"?C.amber:C.sub;
  const urgC=u=>u==="Urgente"?C.rose:u==="Semi-urgente"?C.amber:C.emerald;
  const canRun=species&&(symptoms.length>0||freeSymp.trim().length>0);

  return (
    <div style={{maxWidth:isMobile?"100%":760,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <div style={{width:isMobile?40:48,height:isMobile?40:48,borderRadius:13,background:`linear-gradient(135deg,${C.teal},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?20:24,flexShrink:0}}>🧠</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:isMobile?16:19,color:C.text}}>{t("clinic_ai")}</div>
          <div style={{color:C.sub,fontSize:11}}>Integra dados clínicos e laboratoriais para diagnósticos fundamentados</div>
        </div>
        <button onClick={()=>setHistoryOpen(true)} style={{...btn(C,"outline",true),fontSize:11,flexShrink:0,position:"relative"}}>
          📋 Histórico{history.length>0?` (${history.length})`:""}
        </button>
      </div>
      <div style={{display:"flex",gap:4,background:C.bg,borderRadius:10,padding:4,marginBottom:16,overflowX:"auto"}}>
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>setActiveTab(tb.id)}
            style={{flex:"1 0 auto",padding:isMobile?"7px 8px":"8px 10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:activeTab===tb.id?700:500,fontSize:isMobile?11:12,background:activeTab===tb.id?C.surface:"transparent",color:activeTab===tb.id?C.teal:C.sub,boxShadow:activeTab===tb.id?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all .15s",whiteSpace:"nowrap",position:"relative"}}>
            {tb.label}
            {tb.badge>0&&<span style={{position:"absolute",top:3,right:3,width:14,height:14,borderRadius:"50%",background:C.teal,color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{tb.badge}</span>}
          </button>
        ))}
      </div>

      {activeTab==="clinical"&&(
        <div style={card(C)}>
          <div style={{fontWeight:700,fontSize:13,color:C.teal,marginBottom:14}}>🩺 Dados do Paciente</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:14}}>
            {[
              {label:"ESPÉCIE *",el:<select value={species} onChange={e=>setSpecies(e.target.value)} style={{...inp(C),fontSize:12}}><option value="">Seleccionar</option>{SPECIES_LIST.map(s=><option key={s}>{s}</option>)}</select>},
              {label:"RAÇA",el:<input value={breed} onChange={e=>setBreed(e.target.value)} placeholder="ex: Golden" style={{...inp(C),fontSize:12}}/>},
              {label:"IDADE",el:<input value={age} onChange={e=>setAge(e.target.value)} placeholder="ex: 5 anos" style={{...inp(C),fontSize:12}}/>},
              {label:"SEXO",el:<select value={sex} onChange={e=>setSex(e.target.value)} style={{...inp(C),fontSize:12}}><option value="">—</option><option>Macho inteiro</option><option>Macho castrado</option><option>Fêmea inteira</option><option>Fêmea esterilizada</option></select>},
            ].map(({label,el})=>(
              <div key={label} style={isMobile&&label==="ESPÉCIE *"?{gridColumn:"1/-1"}:{}}><label style={{fontSize:10,fontWeight:700,color:C.sub,display:"block",marginBottom:4}}>{label}</label>{el}</div>
            ))}
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:10,fontWeight:700,color:C.sub,display:"block",marginBottom:8}}>SINAIS CLÍNICOS * <span style={{fontWeight:400}}>(seleccione todos)</span></label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {SYMPTOMS.map(s=>(
                <button key={s} onClick={()=>toggleSym(s)} style={{padding:"5px 10px",borderRadius:18,fontSize:isMobile?11:12,cursor:"pointer",border:symptoms.includes(s)?`2px solid ${C.teal}`:`2px solid ${C.border}`,background:symptoms.includes(s)?C.mint:C.surface,color:symptoms.includes(s)?C.teal:C.sub,fontWeight:symptoms.includes(s)?700:400,transition:"all .15s"}}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:10,fontWeight:700,color:C.sub,display:"block",marginBottom:6}}>OUTROS SINAIS / SINTOMAS NÃO LISTADOS</label>
            <textarea value={freeSymp} onChange={e=>setFreeSymp(e.target.value)} placeholder="Ex: mucosas pálidas, TRC 3s, sopro sistólico grau III/VI, perda de peso progressiva há 3 semanas, pelagem baça…" style={{...inp(C),resize:"vertical",height:80,fontSize:12,lineHeight:1.5}}/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:C.sub,display:"block",marginBottom:6}}>ANAMNESE & INFO ADICIONAL</label>
            <textarea value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Vacinação, desparasitação, medicações actuais, dieta, antecedentes clínicos, exposição a tóxicos…" style={{...inp(C),resize:"vertical",height:70,fontSize:12,lineHeight:1.5}}/>
          </div>
        </div>
      )}

      {activeTab==="blood"&&(
        <div>
          {[{title:"Hemograma Completo",icon:"🩸",params:BLOOD_P.hem,vals:hemo,set:(k,v)=>setHemo(p=>({...p,[k]:v}))},{title:"Bioquímica Sérica",icon:"⚗️",params:BLOOD_P.bio,vals:bio,set:(k,v)=>setBio(p=>({...p,[k]:v}))},{title:"Perfil Hormonal",icon:"🔬",params:BLOOD_P.hor,vals:hor,set:(k,v)=>setHor(p=>({...p,[k]:v}))}].map(sec=>(
            <CollapsibleSection key={sec.title} title={sec.title} icon={sec.icon} C={C} defaultOpen={sec.title==="Hemograma Completo"}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:10}}>
                {sec.params.map(p=><LabField key={p.key} p={p} values={sec.vals} onChange={sec.set} C={C}/>)}
              </div>
            </CollapsibleSection>
          ))}
        </div>
      )}

      {activeTab==="urine"&&(
        <div style={card(C)}>
          <div style={{fontWeight:700,fontSize:13,color:C.teal,marginBottom:14}}>💧 Urinálise Completa</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:10}}>
            {URINE_P.map(p=><LabField key={p.key} p={p} values={urine} onChange={(k,v)=>setUrine(prev=>({...prev,[k]:v}))} C={C}/>)}
          </div>
        </div>
      )}

      {activeTab==="feces"&&(
        <div style={card(C)}>
          <div style={{fontWeight:700,fontSize:13,color:C.teal,marginBottom:14}}>🔬 Análise de Fezes</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:10}}>
            {FECES_P.map(p=><LabField key={p.key} p={p} values={feces} onChange={(k,v)=>setFeces(prev=>({...prev,[k]:v}))} C={C}/>)}
          </div>
        </div>
      )}

      <div style={{position:"sticky",bottom:isMobile?70:20,zIndex:20,marginTop:12}}>
        <button onClick={run} disabled={!canRun||loading}
          style={{...btn(C,"primary"),width:"100%",justifyContent:"center",padding:"13px 20px",fontSize:14,opacity:!canRun?0.45:1,background:`linear-gradient(90deg,${C.teal},${C.tealD})`,borderRadius:12,boxShadow:`0 4px 20px ${C.teal}44`}}>
          {loading?"🔄 A analisar todos os dados…":"🧠 Gerar Diagnóstico Diferencial com IA"}
          {labFilled>0&&!loading&&<span style={{fontSize:11,background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"2px 8px",marginLeft:4}}>{labFilled} dados lab</span>}
        </button>
      </div>

      {error&&(
        <div style={{padding:14,background:C.rose+"15",border:`1px solid ${C.rose}40`,borderRadius:10,marginTop:12}}>
          <div style={{color:C.rose,fontSize:13,fontWeight:700,marginBottom:6}}>❌ Erro ao gerar diagnóstico</div>
          <div style={{color:C.rose,fontSize:12,lineHeight:1.6,marginBottom:10,wordBreak:"break-all"}}>{error}</div>
          <button onClick={run} style={{...btn(C,"primary",true),background:C.rose,fontSize:12}}>🔄 Tentar novamente</button>
        </div>
      )}

      {result&&(
        <div style={{marginTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:isMobile?15:17,color:C.text}}>Resultados da Análise</div>
            <span style={{...tag(urgC(result.urgencia)),fontSize:12}}>⚡ {result.urgencia}</span>
          </div>
          <div style={{background:C.mint,borderRadius:10,padding:14,marginBottom:12,borderLeft:`4px solid ${C.teal}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.teal,marginBottom:5}}>RESUMO CLÍNICO</div>
            <div style={{fontSize:13,lineHeight:1.6,color:C.text}}>{result.resumo}</div>
          </div>
          {result.interpretacao_laboratorial&&result.interpretacao_laboratorial!=="null"&&(
            <div style={{background:C.purple+"10",borderRadius:10,padding:14,marginBottom:12,borderLeft:`4px solid ${C.purple}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.purple,marginBottom:5}}>🔬 INTERPRETAÇÃO LABORATORIAL</div>
              <div style={{fontSize:13,lineHeight:1.6,color:C.text}}>{result.interpretacao_laboratorial}</div>
            </div>
          )}
          {result.alertas?.filter(a=>a).length>0&&(
            <div style={{background:C.rose+"12",borderRadius:10,padding:14,marginBottom:12,borderLeft:`4px solid ${C.rose}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.rose,marginBottom:5}}>⚠️ ALERTAS</div>
              {result.alertas.map((a,i)=><div key={i} style={{fontSize:13,color:C.text}}>• {a}</div>)}
            </div>
          )}
          <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Diagnósticos Diferenciais</div>
          {result.diagnosticos?.map((d,i)=>(
            <div key={i} style={{border:`1.5px solid ${C.border}`,borderRadius:11,padding:isMobile?12:16,marginBottom:10,background:C.surface}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flex:1}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:probC(d.probabilidade)+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:probC(d.probabilidade),flexShrink:0}}>{i+1}</div>
                  <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text}}>{d.nome}</div>
                </div>
                <span style={tag(probC(d.probabilidade))}>{d.probabilidade}</span>
              </div>
              <div style={{fontSize:13,color:C.sub,lineHeight:1.6,marginBottom:10}}>{d.justificacao}</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                <div style={{background:C.teal+"08",borderRadius:8,padding:10}}><div style={{fontSize:10,fontWeight:700,color:C.teal,marginBottom:5}}>TESTES CONFIRMATÓRIOS</div>{d.testes?.map((t2,j)=><div key={j} style={{fontSize:12,color:C.sub,marginBottom:2}}>• {t2}</div>)}</div>
                <div style={{background:C.purple+"08",borderRadius:8,padding:10}}><div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:5}}>TRATAMENTO INICIAL</div><div style={{fontSize:12,color:C.sub,lineHeight:1.5}}>{d.tratamento_inicial}</div></div>
              </div>
            </div>
          ))}
          <div style={{background:C.bg,borderRadius:10,padding:14,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:5}}>📋 PRÓXIMOS PASSOS</div>
            <div style={{fontSize:13,lineHeight:1.6,color:C.text}}>{result.proximos_passos}</div>
          </div>
          <div style={{padding:10,background:C.amber+"18",borderRadius:8,fontSize:11,color:C.sub,textAlign:"center",lineHeight:1.5}}>⚠️ {t("disclaimer")}</div>
        </div>
      )}

      {/* ── History Modal ── */}
      {historyOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>{setHistoryOpen(false);setCompareIds([]);}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:compareIds.length===2?960:560,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.25)",border:`1px solid ${C.border}`}}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <span style={{fontSize:20}}>📋</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15,color:C.text}}>{t("ai_history_title")}</div>
                <div style={{fontSize:11,color:C.sub}}>{history.length} {history.length===1?"caso guardado":"casos guardados"} · Seleccione 2 para comparar</div>
              </div>
              {compareIds.length>0&&<button onClick={()=>setCompareIds([])} style={{...btn(C,"outline",true),fontSize:11}}>Limpar selecção</button>}
              <button onClick={()=>{setHistoryOpen(false);setCompareIds([]);}} aria-label="Fechar histórico" style={{background:"none",border:"none",cursor:"pointer",color:C.sub,fontSize:20,padding:4}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
              {history.length===0&&(
                <div style={{textAlign:"center",color:C.sub,padding:"40px 0"}}>
                  <div style={{fontSize:36,marginBottom:10}}>🧠</div>
                  {t("no_history")+" Os casos analisados aparecem aqui automaticamente."}
                </div>
              )}

              {compareIds.length===2?(
                /* Side-by-side comparison */
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
                  {compareIds.map(id=>{
                    const h = history.find(x=>x.id===id);
                    if(!h) return null;
                    return (
                      <div key={id} style={{border:`1.5px solid ${C.border}`,borderRadius:10,padding:14}}>
                        <div style={{fontSize:11,color:C.sub,marginBottom:6}}>{h.date}</div>
                        <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>{h.species}{h.breed?` · ${h.breed}`:""}</div>
                        <div style={{fontSize:11,color:C.sub,marginBottom:10}}>{h.age||"idade nd"} · {h.sex||"sexo nd"}</div>
                        <div style={{fontSize:12,color:C.text,lineHeight:1.6,marginBottom:10,background:C.mint,borderRadius:8,padding:10}}>{h.result.resumo}</div>
                        <div style={{fontSize:11,fontWeight:700,color:C.sub,marginBottom:6}}>DIAGNÓSTICOS</div>
                        {h.result.diagnosticos?.slice(0,4).map((d,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"5px 0",borderBottom:i<3?`1px solid ${C.border}`:"none"}}>
                            <span style={{fontSize:12,color:C.text}}>{i+1}. {d.nome}</span>
                            <span style={{...tag(probC(d.probabilidade)),fontSize:10,flexShrink:0}}>{d.probabilidade}</span>
                          </div>
                        ))}
                        <div style={{marginTop:10}}><span style={tag(urgC(h.result.urgencia))}>⚡ {h.result.urgencia}</span></div>
                      </div>
                    );
                  })}
                </div>
              ):(
                /* List view */
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {history.map(h=>(
                    <div key={h.id} style={{border:`1.5px solid ${compareIds.includes(h.id)?C.teal:C.border}`,borderRadius:10,padding:14,cursor:"pointer",background:compareIds.includes(h.id)?C.mint:"transparent"}}
                      onClick={()=>{
                        if(compareIds.includes(h.id)) setCompareIds(prev=>prev.filter(x=>x!==h.id));
                        else if(compareIds.length<2) setCompareIds(prev=>[...prev,h.id]);
                      }}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:13,color:C.text}}>{h.species}{h.breed?` · ${h.breed}`:""}</div>
                          <div style={{fontSize:11,color:C.sub}}>{h.date}</div>
                        </div>
                        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                          <span style={tag(urgC(h.result.urgencia))}>{h.result.urgencia}</span>
                          <button onClick={e=>{e.stopPropagation();setHistory(prev=>prev.filter(x=>x.id!==h.id));setCompareIds(prev=>prev.filter(x=>x!==h.id));}}
                            style={{background:"none",border:"none",cursor:"pointer",color:C.sub,fontSize:14}} aria-label="Eliminar do histórico">🗑️</button>
                        </div>
                      </div>
                      <div style={{fontSize:12,color:C.sub,lineHeight:1.5,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{h.symptoms}</div>
                      <div style={{fontSize:11,color:C.teal,fontWeight:600}}>🥇 {h.result.diagnosticos?.[0]?.nome||"—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClinicalCalc({ C, t, isMobile }) {
  const [calcType,setCalcType]=useState("fluids");
  const [weight,setWeight]=useState(""); const [species2,setSpecies2]=useState("cão");
  const [drug,setDrug]=useState(""); const [dose,setDose]=useState("");
  const [result2,setResult2]=useState(null);
  const calcFluids=()=>{const w=parseFloat(weight);if(!w)return;const m=species2==="cão"?w*60:w*40;setResult2({title:"Taxa de Fluidos",items:[{label:"Manutenção diária",value:`${m} mL/dia`},{label:"Manutenção horária",value:`${(m/24).toFixed(1)} mL/h`},{label:"Bólus de choque (10-20 mL/kg)",value:`${(w*10).toFixed(0)}–${(w*20).toFixed(0)} mL em 15-20 min`},{label:"Taxa gotejamento 60gts/mL",value:`${Math.round(m/24)} gts/min`}]});};
  const calcDose=()=>{const w=parseFloat(weight);const d=parseFloat(dose);if(!w||!d)return;setResult2({title:`Dose de ${drug||"fármaco"}`,items:[{label:"Dose total",value:`${(w*d).toFixed(2)} mg`},{label:"Peso",value:`${w} kg`},{label:"Dose/kg",value:`${d} mg/kg`}]});};
  const calcAnest=()=>{const w=parseFloat(weight);if(!w)return;setResult2({title:"Protocolo Anestesia",items:[{label:"Propofol indução (4-6 mg/kg IV)",value:`${(w*4).toFixed(1)}–${(w*6).toFixed(1)} mg`},{label:"Metadona pré-med (0,2 mg/kg)",value:`${(w*0.2).toFixed(2)} mg`},{label:"Midazolam pré-med (0,2 mg/kg)",value:`${(w*0.2).toFixed(2)} mg`},{label:"Fentanil CRI (5 µg/kg/h)",value:`${(w*5/1000).toFixed(3)} mg/h`},{label:"Tubo ET estimado",value:w<5?"4-5mm":w<15?"6-7mm":"8-10mm"}]});};
  const CALCS=[{id:"fluids",label:"💧 Fluidos"},{id:"dose",label:"💊 Dose"},{id:"anest",label:"💉 Anestesia"}];
  return (
    <div style={{maxWidth:isMobile?"100%":600,margin:"0 auto"}}>
      <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text,marginBottom:16}}>🧮 Calculadora Clínica</div>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {CALCS.map(c=><button key={c.id} onClick={()=>{setCalcType(c.id);setResult2(null);}} style={{padding:"7px 14px",borderRadius:18,border:"none",cursor:"pointer",fontWeight:calcType===c.id?700:400,background:calcType===c.id?C.teal:C.bg,color:calcType===c.id?"#fff":C.sub,fontSize:12}}>{c.label}</button>)}
      </div>
      <div style={card(C)}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:14}}>
          <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>PESO (kg) *</label><input value={weight} onChange={e=>setWeight(e.target.value)} placeholder="ex: 12.5" style={{...inp(C),fontSize:13}}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>ESPÉCIE</label><select value={species2} onChange={e=>setSpecies2(e.target.value)} style={{...inp(C),fontSize:13}}><option value="cão">Cão</option><option value="gato">Gato</option></select></div>
          {calcType==="dose"&&<>
            <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>FÁRMACO</label><input value={drug} onChange={e=>setDrug(e.target.value)} placeholder="ex: Amoxicilina" style={{...inp(C),fontSize:13}}/></div>
            <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>DOSE (mg/kg)</label><input value={dose} onChange={e=>setDose(e.target.value)} placeholder="ex: 12.5" style={{...inp(C),fontSize:13}}/></div>
          </>}
        </div>
        <button onClick={calcType==="fluids"?calcFluids:calcType==="dose"?calcDose:calcAnest} disabled={!weight}
          style={{...btn(C,"primary"),width:"100%",justifyContent:"center",opacity:!weight?0.5:1}}>🧮 Calcular</button>
      </div>
      {result2&&(
        <div style={card(C)}>
          <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>{result2.title}</div>
          {result2.items.map((item,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 0",borderBottom:i<result2.items.length-1?`1px solid ${C.border}`:"none",gap:12}}>
              <div style={{fontSize:13,color:C.sub,flex:1}}>{item.label}</div>
              <div style={{fontWeight:700,fontSize:13,color:C.teal,textAlign:"right"}}>{item.value}</div>
            </div>
          ))}
          <div style={{marginTop:12,background:C.amber+"18",borderRadius:8,padding:"8px 12px",fontSize:11,color:C.sub}}>⚠️ Confirme sempre com as guidelines clínicas e ajuste ao paciente individual.</div>
        </div>
      )}
    </div>
  );
}

function DrugDB({ C, t, isMobile }) {
  const [search,setSearch]=useState("");
  const [query,setQuery]=useState("");
  const filtered=DRUGS.filter(d=>
    !query||d.name.toLowerCase().includes(query.toLowerCase())||d.species.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div>
      <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text,marginBottom:14}}>💊 Base de Dados de Fármacos</div>
      <SearchBar
        value={search}
        onChange={v=>{setSearch(v);setQuery(v);}}
        onSearch={v=>{setSearch(v);setQuery(v);}}
        placeholder="🔍 Pesquisar fármaco ou espécie…"
        C={C}
        style={{marginBottom:14}}
      />
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map((d,i)=>(
          <div key={i} style={card(C,{marginBottom:0})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>{d.name}</div>
              <span style={tag(C.teal)}>{d.species}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8}}>
              {[{l:"Dose",v:d.dose},{l:"Frequência",v:d.freq},{l:"Via",v:d.route},{l:"Notas",v:d.notes}].map(({l,v})=>(
                <div key={l}><div style={{fontSize:10,fontWeight:700,color:C.sub,marginBottom:2}}>{l}</div><div style={{fontSize:12,color:C.text}}>{v}</div></div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length===0&&<div style={{textAlign:"center",color:C.sub,padding:30,fontSize:14}}>Nenhum fármaco encontrado.</div>}
      </div>
    </div>
  );
}

function Protocols({ C, t, isMobile }) {
  const [sel,setSel]=useState(null);
  if(sel) return (
    <div>
      <button onClick={()=>setSel(null)} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",color:C.teal,fontWeight:600,marginBottom:16,fontSize:13}}><Icon d={ic.back} size={16} color={C.teal}/> Voltar</button>
      <div style={card(C)}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}><span style={{fontSize:32}}>{sel.icon}</span><div><div style={{fontWeight:800,fontSize:16,color:C.text}}>{sel.title}</div><div style={{fontSize:12,color:C.sub}}>{sel.spec} · por {sel.author}</div></div></div>
        <div style={{fontSize:13,color:C.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{sel.content}</div>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text,marginBottom:14}}>📋 Protocolos Clínicos</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {PROTOCOLS.map(p=>(
          <div key={p.id} onClick={()=>setSel(p)} style={{...card(C,{marginBottom:0}),cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:48,height:48,borderRadius:12,background:C.teal+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{p.icon}</div>
            <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:C.text}}>{p.title}</div><div style={{fontSize:11,color:C.sub}}>{p.spec} · {p.author}</div></div>
            <div style={{transform:"rotate(180deg)",display:"flex"}}><Icon d={ic.back} size={16} color={C.sub}/></div>
          </div>
        ))}
        <div style={{...card(C,{marginBottom:0}),border:`2px dashed ${C.border}`,textAlign:"center",color:C.sub,cursor:"pointer",padding:"20px 18px"}}>
          <div style={{fontSize:24,marginBottom:6}}>📋</div>
          <div style={{fontWeight:600,fontSize:13,color:C.text,marginBottom:4}}>Publicar Protocolo</div>
          <div style={{fontSize:12}}>Partilhe os seus protocolos com a comunidade veterinária</div>
        </div>
      </div>
    </div>
  );
}

const mapCaseRow = (row) => ({
  id: row.id,
  user: {
    id: row.author_id,
    name: row.profiles?.full_name || "Utilizador",
    avatar: initialsOf(row.profiles?.full_name),
    spec: row.profiles?.specialty || "",
    online: true,
  },
  title: row.title,
  species: row.species,
  breed: row.breed,
  age: row.age,
  sex: row.sex,
  date: timeAgo(row.created_at),
  status: row.status,
  replies: row.replies_count || 0,
  S: row.subjective, O: row.objective, A: row.assessment, P: row.plan,
});

function SOAPCases({ C, t, isMobile, me }) {
  const [sel,setSel]=useState(null);
  const [caseComments, setCaseComments] = useState({});
  const [caseInputs, setCaseInputs] = useState({});
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [newCase, setNewCase] = useState({title:"",meta:"",S:"",O:"",A:"",P:""});
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [soapFb, triggerSoapFb] = useFeedback();

  const loadCases = async () => {
    const { data, error } = await supabase
      .from("soap_cases")
      .select("*, profiles:author_id(full_name,specialty)")
      .order("created_at", { ascending: false })
      .limit(30);
    if(error){ console.error(error); setCasesLoading(false); return; }
    setCases((data||[]).map(mapCaseRow));
    setCasesLoading(false);
  };
  useEffect(() => { loadCases(); }, []);

  const openCase = async (c) => {
    setSel(c);
    if(!caseComments[c.id]){
      const { data, error } = await supabase
        .from("soap_case_comments")
        .select("id, text, created_at, profiles:author_id(full_name)")
        .eq("case_id", c.id)
        .order("created_at", { ascending: true });
      if(error){ console.error(error); return; }
      setCaseComments(prev=>({...prev,[c.id]:(data||[]).map(cm=>({
        id: cm.id,
        user: { name: cm.profiles?.full_name || "Utilizador", avatar: initialsOf(cm.profiles?.full_name) },
        text: cm.text,
        time: timeAgo(cm.created_at),
      }))}));
    }
  };

  const submitCaseComment = async (caseId) => {
    const text = (caseInputs[caseId]||"").trim();
    if(!text) return;
    setCaseInputs(prev=>({...prev,[caseId]:""}));
    const { data, error } = await supabase.from("soap_case_comments").insert({ case_id: caseId, author_id: me.id, text }).select().single();
    if(error){ console.error(error); return; }
    setCaseComments(prev=>({...prev,[caseId]:[...(prev[caseId]||[]),{id:data.id,user:me,text,time:"agora"}]}));
    setCases(prev=>prev.map(c=>c.id===caseId?{...c,replies:c.replies+1}:c));
  };

  const createCase = async () => {
    if(!newCase.title.trim()) return;
    const parts = newCase.meta.split("·").map(s=>s.trim());
    const { data, error } = await supabase.from("soap_cases").insert({
      author_id: me.id,
      title: newCase.title.trim(),
      species: parts[0]||"", breed: parts[1]||"", age: parts[2]||"", sex: parts[3]||"",
      subjective: newCase.S, objective: newCase.O, assessment: newCase.A, plan: newCase.P,
    }).select().single();
    if(error){ console.error(error); return; }
    setCases(prev=>[mapCaseRow({...data, profiles:{full_name:me.name,specialty:me.spec}}), ...prev]);
    setNewCase({title:"",meta:"",S:"",O:"",A:"",P:""});
    setNewCaseOpen(false);
  };

  if(sel) return (
    <div>
      <button onClick={()=>setSel(null)} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",color:C.teal,fontWeight:600,marginBottom:16,fontSize:13}}><Icon d={ic.back} size={16} color={C.teal}/> Voltar</button>
      <div style={card(C)}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={ava(C,40,sel.user.online)}>{sel.user.avatar}</div>
          <div><div style={{fontWeight:700,fontSize:14,color:C.text}}>{sel.title}</div><div style={{fontSize:11,color:C.sub}}>{sel.user.name} · {sel.species} · {sel.age} · {sel.sex}</div></div>
        </div>
        {[{key:"S",label:"S — Subjectivo",color:C.teal},{key:"O",label:"O — Objectivo",color:C.purple},{key:"A",label:"A — Avaliação",color:C.amber},{key:"P",label:"P — Plano",color:C.emerald}].map(sec=>(
          <div key={sec.key} style={{borderLeft:`4px solid ${sec.color}`,paddingLeft:14,marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:800,color:sec.color,marginBottom:6}}>{sec.label}</div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>{sel[sec.key]}</div>
          </div>
        ))}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:10}}>
            💬 Discussão ({(caseComments[sel.id]||[]).length+sel.replies} respostas)
          </div>
          {(caseComments[sel.id]||[]).map(c=>(
            <div key={c.id} style={{display:"flex",gap:10,marginBottom:10}}>
              <div style={ava(C,30)}>{c.user.avatar}</div>
              <div style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 12px"}}>
                <div style={{fontWeight:700,fontSize:11,color:C.text,marginBottom:2}}>{c.user.name} · {c.time}</div>
                <div style={{fontSize:12,color:C.text}}>{c.text}</div>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={ava(C,30,true)}>{me.avatar}</div>
            <div style={{flex:1}}>
              <textarea value={caseInputs[sel.id]||""} onChange={e=>setCaseInputs(p=>({...p,[sel.id]:e.target.value}))}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitCaseComment(sel.id);}}}
                placeholder="Adicionar comentário clínico… (Enter para enviar)"
                style={{...inp(C),resize:"vertical",height:70,fontSize:13,marginBottom:8}}/>
              <button onClick={()=>submitCaseComment(sel.id)} disabled={!(caseInputs[sel.id]||"").trim()}
                style={{...btn(C,"primary",true),opacity:!(caseInputs[sel.id]||"").trim()?0.5:1}}>Publicar comentário</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text}}>🔬 Casos Clínicos SOAP</div>
        <button onClick={()=>setNewCaseOpen(true)} style={btn(C,"primary",isMobile)}>+ Novo Caso</button>
      </div>
      {newCaseOpen&&(
        <div style={{...card(C),border:`1.5px solid ${C.teal}`,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:13,color:C.teal,marginBottom:12}}>🔬 Novo Caso SOAP</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:10}}>
            <input value={newCase.title} onChange={e=>setNewCase(p=>({...p,title:e.target.value}))} placeholder="Título do caso" style={{...inp(C),fontSize:12}}/>
            <input value={newCase.meta} onChange={e=>setNewCase(p=>({...p,meta:e.target.value}))} placeholder="Espécie · Raça · Idade · Sexo" style={{...inp(C),fontSize:12}}/>
          </div>
          {["S","O","A","P"].map(key=>(
            <div key={key} style={{marginBottom:8}}>
              <label style={{fontSize:10,fontWeight:700,color:C.teal,display:"block",marginBottom:3}}>{key} — {{"S":"Subjectivo","O":"Objectivo","A":"Avaliação","P":"Plano"}[key]}</label>
              <textarea value={newCase[key]} onChange={e=>setNewCase(p=>({...p,[key]:e.target.value}))}
                placeholder={{"S":"Queixas e história…","O":"Exame físico e exames…","A":"Diagnósticos…","P":"Tratamento e plano…"}[key]}
                rows={2} style={{...inp(C),fontSize:12,resize:"vertical"}}/>
            </div>
          ))}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
            <button onClick={()=>{setNewCaseOpen(false);setNewCase({title:"",meta:"",S:"",O:"",A:"",P:""}); }} style={btn(C,"outline",true)}>Cancelar</button>
            <button onClick={createCase} disabled={!newCase.title.trim()}
              style={{...btn(C,"primary",true),opacity:!newCase.title.trim()?0.5:1}}>✓ Publicar Caso</button>
          </div>
        </div>
      )}
      {casesLoading&&<div style={{textAlign:"center",color:C.sub,padding:"30px 0",fontSize:13}}>A carregar casos…</div>}
      {!casesLoading&&cases.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"30px 0",fontSize:13}}>Ainda não há casos partilhados.</div>}
      {cases.map(c=>(
        <div key={c.id} onClick={()=>openCase(c)} style={{...card(C,{marginBottom:12,cursor:"pointer"})}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
            <div style={ava(C,38,c.user.online)}>{c.user.avatar}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:isMobile?13:14,color:C.text,marginBottom:2}}>{c.title}</div>
              <div style={{fontSize:11,color:C.sub}}>{c.user.name} · {c.species} · {c.age} · {c.date}</div>
            </div>
            <span style={tag(c.status==="Resolvido"?C.emerald:C.amber)}>{c.status}</span>
          </div>
          <div style={{background:C.bg,borderRadius:8,padding:"8px 12px",marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:C.teal,marginBottom:3}}>S — SUBJECTIVO</div>
            <div style={{fontSize:12,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{c.S}</div>
          </div>
          <div style={{fontSize:12,color:C.sub}}>💬 {c.replies} comentários clínicos</div>
        </div>
      ))}
    </div>
  );
}

function ExpertMap({ C, t, isMobile, me, setMainTab }) {
  const [specFilter,setSpecFilter]=useState("Todos");
  const [experts,setExperts]=useState([]);
  const [expertsLoading,setExpertsLoading]=useState(true);
  const [expertFb, triggerExpertFb] = useFeedback();

  useEffect(() => {
    if(!me?.id) return;
    (async () => {
      setExpertsLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, country")
        .neq("id", me.id)
        .order("full_name")
        .limit(100);
      if(!error) setExperts(data||[]);
      setExpertsLoading(false);
    })();
  }, [me?.id]);

  const specs=["Todos",...Array.from(new Set(experts.map(e=>e.specialty).filter(Boolean)))];
  const filtered=specFilter==="Todos"?experts:experts.filter(e=>e.specialty===specFilter);

  const contact = async (e) => {
    const { error } = await supabase.rpc("get_or_create_dm", { other_user_id: e.id });
    if(error){ console.error(error); return; }
    triggerExpertFb("contact_"+e.id);
    setMainTab?.("community");
  };

  return (
    <div>
      <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text,marginBottom:6}}>🗺️ Mapa de Especialistas</div>
      <div style={{color:C.sub,fontSize:12,marginBottom:14}}>Encontre colegas por especialidade para referenciação</div>
      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
        {specs.map(s=><button key={s} onClick={()=>setSpecFilter(s)} style={{padding:"5px 12px",borderRadius:18,border:"none",cursor:"pointer",fontWeight:specFilter===s?700:400,background:specFilter===s?C.teal:C.bg,color:specFilter===s?"#fff":C.sub,fontSize:12,whiteSpace:"nowrap"}}>{s}</button>)}
      </div>
      {expertsLoading&&<div style={{textAlign:"center",color:C.sub,padding:"30px 0",fontSize:13}}>A carregar…</div>}
      {!expertsLoading&&filtered.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"30px 0",fontSize:13}}>Sem colegas encontrados.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(e=>(
          <div key={e.id} style={{...card(C,{marginBottom:0}),display:"flex",alignItems:"center",gap:12}}>
            <div style={ava(C,44)}>{initialsOf(e.full_name)}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:C.text}}>{e.full_name||"Utilizador"}</div>
              <div style={{fontSize:11,color:C.sub}}>{e.specialty||"Sem especialidade"}{e.country?` · 📍 ${e.country}`:""}</div>
            </div>
            <button onClick={()=>contact(e)}
              style={{...btn(C,expertFb===("contact_"+e.id)?"primary":"outline",true),background:expertFb===("contact_"+e.id)?C.emerald:undefined}}>
              {expertFb===("contact_"+e.id)?"✓ Enviado!":"Contactar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Clinic({ C, t, isMobile, me, setMainTab }) {
  const [sub,setSub]=useState("ai");
  const SUBS=[{id:"ai",label:"🧠 "+t("clinic_ai")},{id:"calc",label:"🧮 Calc."},{id:"drugs",label:"💊 "+t("clinic_drugs")},{id:"protocols",label:"📋 "+t("clinic_protocols")},{id:"cases",label:"🔬 "+t("profile_cases")},{id:"map",label:"🗺️ "+t("clinic_map")}];
  return (
    <div>
      <div style={{display:"flex",gap:0,background:C.bg,borderRadius:10,padding:4,marginBottom:18,overflowX:"auto",flexShrink:0}}>
        {SUBS.map(s=><button key={s.id} onClick={()=>setSub(s.id)} style={{flex:"0 0 auto",padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:sub===s.id?700:500,fontSize:isMobile?10.5:12,background:sub===s.id?C.surface:"transparent",color:sub===s.id?C.teal:C.sub,boxShadow:sub===s.id?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all .15s",whiteSpace:"nowrap"}}>{s.label}</button>)}
      </div>
      {sub==="ai"&&<AIDiagnosis C={C} t={t} isMobile={isMobile}/>}
      {sub==="calc"&&<ClinicalCalc C={C} t={t} isMobile={isMobile}/>}
      {sub==="drugs"&&<DrugDB C={C} t={t} isMobile={isMobile}/>}
      {sub==="protocols"&&<Protocols C={C} t={t} isMobile={isMobile}/>}
      {sub==="cases"&&<SOAPCases C={C} t={t} isMobile={isMobile} me={me}/>}
      {sub==="map"&&<ExpertMap C={C} t={t} isMobile={isMobile} me={me} setMainTab={setMainTab}/>}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════════════════════════
function Profile({ C, t, isMobile, me, profileLoaded, onProfileSaved }) {
  const u=me;
  const [sub,setSub]=useState("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [profileName, setProfileName] = useState(u.name);
  const [profileSpec, setProfileSpec] = useState(u.spec);
  const [profileBio, setProfileBio] = useState(u.bio);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [profFb, triggerProfFb] = useFeedback();

  useEffect(() => {
    setProfileName(u.name); setProfileSpec(u.spec); setProfileBio(u.bio);
  }, [u.name, u.spec, u.bio]);

  const saveProfile = async () => {
    setSaving(true); setSaveError("");
    const { error: err } = await supabase.from("profiles").update({
      full_name: profileName.trim(),
      specialty: profileSpec,
      bio: profileBio,
    }).eq("id", u.id);
    setSaving(false);
    if(err){ setSaveError(err.message); return; }
    setEditOpen(false);
    triggerProfFb("saved");
    onProfileSaved?.();
  };

  const [myPosts, setMyPosts] = useState([]);
  const [myPostsLoading, setMyPostsLoading] = useState(true);
  const [myCases, setMyCases] = useState([]);
  const [myCasesLoading, setMyCasesLoading] = useState(true);

  useEffect(() => {
    if(!u.id) return;
    (async () => {
      setMyPostsLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, likes_count, comments_count, created_at")
        .eq("author_id", u.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if(!error) setMyPosts(data||[]);
      setMyPostsLoading(false);
    })();
    (async () => {
      setMyCasesLoading(true);
      const { data, error } = await supabase
        .from("soap_cases")
        .select("id, title, species, age, status, subjective")
        .eq("author_id", u.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if(!error) setMyCases(data||[]);
      setMyCasesLoading(false);
    })();
  }, [u.id]);

  const SUBS=[{id:"posts",label:"📝 "+t("profile_posts")},{id:"cases",label:"🔬 "+t("profile_cases")},{id:"certs",label:"🎓 "+t("profile_certs")},{id:"stats",label:"📊 "+t("profile_stats")}];
  if(!profileLoaded) return <SkeletonFeed C={C}/>;
  return (
    <div style={{maxWidth:isMobile?"100%":760,margin:"0 auto"}}>
      {editOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setEditOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:460,boxShadow:"0 8px 40px rgba(0,0,0,0.25)",border:`1px solid ${C.border}`}}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:800,fontSize:15,color:C.text}}>✏️ Editar Perfil</div>
              <button onClick={()=>setEditOpen(false)} aria-label={t("close")} style={{background:"none",border:"none",cursor:"pointer",color:C.sub,fontSize:20}}>✕</button>
            </div>
            <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>
              <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>{t("name").toUpperCase()}</label>
                <input value={profileName} onChange={e=>setProfileName(e.target.value)} style={{...inp(C),fontSize:13}}/></div>
              <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>{t("specialty").toUpperCase()}</label>
                <select value={profileSpec} onChange={e=>setProfileSpec(e.target.value)} style={{...inp(C),fontSize:13}}>
                  {SPECIALTIES.map(s=><option key={s}>{s}</option>)}
                </select></div>
              <div><label style={{fontSize:11,fontWeight:700,color:C.sub,display:"block",marginBottom:5}}>{t("bio").toUpperCase()}</label>
                <textarea value={profileBio} onChange={e=>setProfileBio(e.target.value)} rows={3} style={{...inp(C),fontSize:13,resize:"vertical"}}/></div>
              {saveError&&<div style={{background:C.rose+"15",border:`1px solid ${C.rose}40`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.rose}}>⚠️ {saveError}</div>}
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
                <button onClick={()=>setEditOpen(false)} style={btn(C,"outline",true)}>Cancelar</button>
                <button onClick={saveProfile} disabled={saving} style={{...btn(C,"primary",true),opacity:saving?0.75:1}}>{saving?"A guardar…":"💾 Guardar alterações"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{...card(C,{padding:0,overflow:"hidden",marginBottom:14})}}>
        <div style={{height:isMobile?90:130,background:`linear-gradient(135deg,${C.teal},${C.tealL},${C.purple})`}}/>
        <div style={{padding:isMobile?14:20}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:12,marginTop:isMobile?-32:-42,marginBottom:14,flexWrap:isMobile?"wrap":"nowrap"}}>
            <div style={{...ava(C,isMobile?64:82),fontSize:isMobile?22:28,border:`4px solid ${C.surface}`,boxShadow:"0 4px 16px rgba(0,0,0,0.12)"}}>{u.avatar}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:isMobile?16:20,color:C.text,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                {u.name}
              </div>
              <div style={{color:C.sub,fontSize:12,marginBottom:4}}>{u.spec}{u.country?" · "+u.country:""}{u.license?" · "+u.license:""}</div>
            </div>
            <button onClick={()=>setEditOpen(true)} style={{...btn(C,"primary",isMobile),background:profFb==="saved"?C.emerald:C.teal}}>
              {profFb==="saved"?t("saved_ok"):t("edit_profile")}
            </button>
          </div>
          {profileBio&&<div style={{fontSize:13,color:C.sub,lineHeight:1.6,marginBottom:12}}>{profileBio}</div>}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {u.interests.map(i=><span key={i} style={tag(C.teal)}>{i}</span>)}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:0,background:C.bg,borderRadius:10,padding:4,marginBottom:16,overflowX:"auto"}}>
        {SUBS.map(s=><button key={s.id} onClick={()=>setSub(s.id)} style={{flex:"1 0 auto",padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:sub===s.id?700:500,fontSize:isMobile?11:12,background:sub===s.id?C.surface:"transparent",color:sub===s.id?C.teal:C.sub,boxShadow:sub===s.id?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all .15s",whiteSpace:"nowrap"}}>{s.label}</button>)}
      </div>
      {sub==="posts"&&myPostsLoading&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>A carregar…</div>}
      {sub==="posts"&&!myPostsLoading&&myPosts.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>Ainda sem publicações.</div>}
      {sub==="posts"&&myPosts.map(p=>(
        <div key={p.id} style={card(C)}>
          <div style={{fontSize:13,color:C.text,lineHeight:1.6,marginBottom:8}}>{p.content.slice(0,150)}…</div>
          <div style={{display:"flex",gap:8,fontSize:12,color:C.sub}}><span>❤️ {p.likes_count}</span><span>💬 {p.comments_count}</span><span>{timeAgo(p.created_at)}</span></div>
        </div>
      ))}
      {sub==="cases"&&myCasesLoading&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>A carregar…</div>}
      {sub==="cases"&&!myCasesLoading&&myCases.length===0&&<div style={{textAlign:"center",color:C.sub,padding:"20px 0",fontSize:13}}>Ainda sem casos SOAP.</div>}
      {sub==="cases"&&myCases.map(c=>(
        <div key={c.id} style={card(C)}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:4}}>{c.title}</div>
          <div style={{fontSize:11,color:C.sub,marginBottom:8}}>{c.species} · {c.age} · <span style={tag(c.status==="Resolvido"?C.emerald:C.amber)}>{c.status}</span></div>
          <div style={{fontSize:12,color:C.sub}}>{(c.subjective||"").slice(0,100)}…</div>
        </div>
      ))}
      {sub==="certs"&&[{t:"Especialista em Medicina Interna",o:"ECVIM-CA",y:"2019",i:"🎓"},{t:"Doutoramento em Ciências Veterinárias",o:"Univ. Lisboa",y:"2016",i:"📜"},{t:"Mestrado em Animais de Companhia",o:"Univ. Évora",y:"2011",i:"📋"}].map((e,i)=>(
        <div key={i} style={card(C)}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}><span style={{fontSize:24}}>{e.i}</span><div><div style={{fontWeight:700,fontSize:13,color:C.text}}>{e.t}</div><div style={{fontSize:11,color:C.sub}}>{e.o} · {e.y}</div></div></div>
        </div>
      ))}
      {sub==="stats"&&(()=>{
        const followerData = [
          {month:"Jan",seguidores:680,engagement:4.1},
          {month:"Fev",seguidores:720,engagement:4.6},
          {month:"Mar",seguidores:758,engagement:5.0},
          {month:"Abr",seguidores:801,engagement:5.3},
          {month:"Mai",seguidores:849,engagement:5.9},
          {month:"Jun",seguidores:892,engagement:6.4},
        ];
        const engagementByType = [
          {tipo:"Casos clínicos",valor:142},
          {tipo:"Publicações",valor:88},
          {tipo:"Eventos",valor:34},
          {tipo:"Comentários",valor:97},
        ];
        const tooltipStyle = {background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text};
        return (
          <div>
            {/* Top KPI row */}
            <div style={card(C)}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:16}}>📊 Estatísticas do Perfil</div>
              {[{label:"Visualizações do perfil (30 dias)",value:"1.247",trend:"+12%",up:true},{label:"Impressões das publicações",value:"8.932",trend:"+28%",up:true},{label:"Seguidores ganhos este mês",value:"+43",trend:"+8%",up:true},{label:"Taxa de engagement",value:"6.4%",trend:"+1.2%",up:true},{label:"Casos clínicos comentados",value:"12",trend:"+4",up:true}].map((s,i,arr)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
                  <div style={{fontSize:13,color:C.sub}}>{s.label}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontWeight:800,fontSize:14,color:C.text}}>{s.value}</span>
                    <span style={{fontSize:11,color:s.up?C.emerald:C.rose,fontWeight:600}}>{s.trend}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Followers growth chart */}
            <div style={card(C)}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>📈 Crescimento de Seguidores</div>
              <div style={{fontSize:11,color:C.sub,marginBottom:14}}>Últimos 6 meses</div>
              <div style={{width:"100%",height:200}}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={followerData} margin={{top:4,right:8,left:-20,bottom:0}}>
                    <defs>
                      <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.teal} stopOpacity={0.35}/>
                        <stop offset="100%" stopColor={C.teal} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="month" tick={{fontSize:11,fill:C.sub}} axisLine={{stroke:C.border}} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:C.sub}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={tooltipStyle}/>
                    <Area type="monotone" dataKey="seguidores" stroke={C.teal} strokeWidth={2.5} fill="url(#followerGrad)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Engagement rate trend */}
            <div style={card(C)}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>💬 Taxa de Engagement</div>
              <div style={{fontSize:11,color:C.sub,marginBottom:14}}>Percentagem mensal (%)</div>
              <div style={{width:"100%",height:180}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={followerData} margin={{top:4,right:8,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="month" tick={{fontSize:11,fill:C.sub}} axisLine={{stroke:C.border}} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:C.sub}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={tooltipStyle}/>
                    <Line type="monotone" dataKey="engagement" stroke={C.purple} strokeWidth={2.5} dot={{r:4,fill:C.purple}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Content breakdown bar chart */}
            <div style={card(C,{marginBottom:0})}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>🗂️ Interacções por Tipo de Conteúdo</div>
              <div style={{fontSize:11,color:C.sub,marginBottom:14}}>Total acumulado</div>
              <div style={{width:"100%",height:180}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagementByType} margin={{top:4,right:8,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="tipo" tick={{fontSize:10,fill:C.sub}} axisLine={{stroke:C.border}} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:C.sub}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={tooltipStyle}/>
                    <Bar dataKey="valor" fill={C.emerald} radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
const initialsOf = (name) => (name||"").trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase() || "?";

const timeAgo = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const NOTIF_ACTIONS = {
  like: "gostou da sua publicação",
  comment: "comentou na sua publicação",
  case_comment: "comentou no seu caso clínico",
  msg: "enviou-lhe uma mensagem",
};
const NOTIF_COLORS = { like:"#E05C6A", comment:"#0D7377", case_comment:"#6C3FC7", msg:"#E8A838" };
const mapNotifRow = (row) => ({
  id: row.id,
  type: row.type,
  user: row.actor?.full_name || "Alguém",
  avatar: initialsOf(row.actor?.full_name),
  action: NOTIF_ACTIONS[row.type] || "",
  target: row.target || "",
  time: timeAgo(row.created_at),
  read: row.read,
  color: NOTIF_COLORS[row.type],
});

export default function VetConnect() {
  // ── Auth (Supabase) ──────────────────────────────────────────────────────
  const [session, setSession] = useState(undefined); // undefined = ainda a carregar, null = sem sessão
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data || null);
  };

  useEffect(() => {
    if (session?.user?.id) refreshProfile(session.user.id);
    else setProfile(null);
  }, [session?.user?.id]);

  const signOut = () => supabase.auth.signOut();

  // "me" — objecto derivado do perfil real, na forma que o resto do código espera
  const me = {
    id: session?.user?.id || null,
    name: profile?.full_name || session?.user?.email || "Utilizador",
    spec: profile?.specialty || "Sem especialidade definida",
    avatar: initialsOf(profile?.full_name || session?.user?.email),
    country: profile?.country || "",
    license: profile?.license || "",
    bio: profile?.bio || "",
    online: true,
    verified: false,
    rep: 0,
    interests: profile?.interests || [],
  };

  const onboarded = !!session;
  const onboardLoaded = session !== undefined;
  const [mainTab,setMainTab]=useState("home");
  const [dark,setDark]=usePersistentState("vc_dark",false);
  const [lang,setLang]=usePersistentState("vc_lang","pt");
  const [notifOpen,setNotifOpen]=useState(false);
  const [langOpen,setLangOpen]=useState(false);
  const [searchQ,setSearchQ]=useState("");
  const [searchOpen,setSearchOpen]=useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);

  // ── Global notification state (lifted from NotifPanel) ──────────────────────
  const [globalNotifs, setGlobalNotifs] = useState([]);
  const [toast, setToast] = useState(null); // {id, icon, title, body, color}

  // Request browser notification permission once onboarded
  useEffect(() => {
    if(!onboarded) return;
    if(typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [onboarded]);

  // ── Notification engine (real: post likes/comments, case comments, messages) ─
  useEffect(() => {
    if(!me.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, target, read, created_at, actor:actor_id(full_name)")
        .eq("recipient_id", me.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if(!error && !cancelled) setGlobalNotifs((data||[]).map(mapNotifRow));
    })();
    return () => { cancelled = true; };
  }, [me.id]);

  useEffect(() => {
    if(!me.id) return;
    const channel = supabase.channel(`notifications:${me.id}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"notifications", filter:`recipient_id=eq.${me.id}` }, async payload => {
        let actorName = null;
        if(payload.new.actor_id){
          const { data } = await supabase.from("profiles").select("full_name").eq("id", payload.new.actor_id).single();
          actorName = data?.full_name;
        }
        const mapped = mapNotifRow({ ...payload.new, actor: { full_name: actorName } });
        setGlobalNotifs(prev => [mapped, ...prev]);
        setToast(mapped);
        if(typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(mapped.user, { body: mapped.action + (mapped.target ? ` — ${mapped.target}` : ""), icon: "🐾" });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [me.id]);

  // Auto-dismiss toast after 5 s
  useEffect(() => {
    if(!toast) return;
    const tid = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(tid);
  }, [toast]);

  const unreadNotifs = globalNotifs.filter(n=>!n.read).length;

  const {isMobile,isTablet}=useBreakpoint();
  const C=dark?DARK:LIGHT;
  const t=k=>getTR(lang,k);
  const currentLang=LANGS.find(l=>l.code===lang)||LANGS[0];

  const NAV=[
    {id:"home",label:t("nav_home"),icon:ic.home},
    {id:"community",label:t("nav_community"),icon:ic.msg,badge:3},
    {id:"learn",label:t("nav_learn"),icon:ic.book},
    {id:"market",label:t("nav_market"),icon:ic.shop},
    {id:"clinic",label:t("nav_clinic"),icon:ic.brain,betaBadge:true},
  ];
  const BOTTOM_NAV=[
    {id:"home",label:t("nav_home"),icon:ic.home},
    {id:"community",label:"Msgs",icon:ic.msg,badge:3},
    {id:"clinic",label:"IA",icon:ic.brain},
    {id:"market",label:"Mercado",icon:ic.shop},
    {id:"more",label:"Mais",icon:ic.more},
  ];
  const MORE_ITEMS=[
    {id:"learn",label:t("nav_learn"),icon:ic.book},
    {id:"profile",label:t("nav_profile"),icon:ic.user},
    {id:"settings",label:t("settings"),icon:ic.cog},
  ];

  const Settings = ({ C, t, isMobile }) => (
    <div style={{maxWidth:isMobile?"100%":600,margin:"0 auto"}}>
      <div style={{fontWeight:800,fontSize:isMobile?17:20,color:C.text,marginBottom:18}}>⚙️ {t("settings")}</div>
      {[
        {section:"Conta", items:[{label:t("edit_profile"),icon:"👤",sub:"Nome, especialidade, foto",action:()=>changeTab("profile")},{label:"Verificação de Identidade",icon:"🔒",sub:"OMV / CRMV número de cédula"},{label:"Alterar Password",icon:"🔑",sub:"Segurança da conta",action:()=>supabase.auth.resetPasswordForEmail(session.user.email)}]},
        {section:"Aparência", items:[{label:"Modo Escuro",icon:dark?"🌙":"☀️",sub:dark?"Activo":"Inactivo",action:()=>setDark(d=>!d),toggle:true,value:dark},{label:"Idioma",icon:currentLang.flag,sub:currentLang.label,action:()=>setLangOpen(true)}]},
        {section:"Notificações", items:[{label:"Notificações Push",icon:"🔔",sub:"Novas mensagens, likes e comentários"},{label:"Emails",icon:"📧",sub:"Resumo semanal e alertas"},{label:"Lives e Eventos",icon:"📡",sub:"Avisos de transmissões ao vivo"}]},
        {section:"Privacidade", items:[{label:"Visibilidade do Perfil",icon:"👁",sub:"Público · Apenas colegas"},{label:"Dados Pessoais",icon:"🛡️",sub:"RGPD — exportar ou eliminar dados"},{label:"Sessões Activas",icon:"📱",sub:"Gerir dispositivos ligados"}]},
        {section:"Sessão", items:[{label:"Terminar Sessão",icon:"🚪",sub:session?.user?.email||"",action:signOut}]},
      ].map(({section,items})=>(
        <div key={section} style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:C.sub,letterSpacing:1,textTransform:"uppercase",marginBottom:8,paddingLeft:4}}>{section}</div>
          <div style={{...card(C,{padding:0,overflow:"hidden"})}}>
            {items.map((item,i)=>(
              <div key={item.label} onClick={item.action}
                role={item.action?"button":undefined}
                tabIndex={item.action?0:undefined}
                onKeyDown={e=>{if(item.action&&(e.key==="Enter"||e.key===" "))item.action();}}
                aria-label={item.label}
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",cursor:item.action?"pointer":"default",borderBottom:i<items.length-1?`1px solid ${C.border}`:"none",transition:"background .15s"}}
                onMouseEnter={e=>{if(item.action)e.currentTarget.style.background=C.bg;}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.surface;}}>
                <span style={{fontSize:20,flexShrink:0}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,color:C.text}}>{item.label}</div>
                  <div style={{fontSize:12,color:C.sub}}>{item.sub}</div>
                </div>
                {item.toggle?(
                  <div onClick={item.action} style={{width:42,height:24,borderRadius:12,background:item.value?C.teal:C.border,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                    <div style={{position:"absolute",top:3,left:item.value?20:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
                  </div>
                ):(
                  <div style={{transform:"rotate(180deg)",display:"flex"}}><Icon d={ic.back} size={16} color={C.sub}/></div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{textAlign:"center",padding:"10px 0 4px"}}>
        <div style={{fontSize:12,color:C.sub,marginBottom:4}}>{APP_NAME} · v{APP_VERSION} · Build {APP_BUILD}</div>
        <div style={{fontSize:11,color:C.sub,marginBottom:12}}>Desenvolvido com ❤️ para a comunidade veterinária global</div>
        <button onClick={()=>window.open("mailto:beta@vetconnect.pt?subject=Feedback+Beta+"+APP_VERSION,"_blank")}
          style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 16px",fontSize:12,cursor:"pointer",color:C.teal,fontWeight:600}}>
          📧 Enviar Feedback Beta
        </button>
      </div>
    </div>
  );

  const TABS={home:Home,community:Community,learn:Learn,market:Market,clinic:Clinic,profile:Profile,settings:Settings};
  const ActiveComp=TABS[mainTab]||Home;
  const tabLabel=NAV.find(n=>n.id===mainTab)?.label||MORE_ITEMS.find(n=>n.id===mainTab)?.label||mainTab;
  const [tabLoading, setTabLoading] = useState(false);
  const [betaBannerDismissed, setBetaBannerDismissed] = usePersistentState("vc_beta_dismissed", false);

  // Intercept tab changes to show skeleton briefly
  const changeTab = (tab) => {
    if(tab===mainTab) return;
    setTabLoading(true);
    setMainTab(tab);
    setTimeout(()=>setTabLoading(false), 300);
  };

  const [authMode, setAuthMode] = useState("login"); // "login" | "register"

  // Avoid flashing the login screen before we know if the user already has a session
  if(!onboardLoaded) return (
    <div style={{position:"fixed",inset:0,background:LIGHT.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:48}}>🐾</div>
    </div>
  );

  if(!onboarded) return (
    <DarkCtx.Provider value={{dark,toggle:()=>setDark(d=>!d)}}>
      <LangCtx.Provider value={{lang,t}}>
        {authMode==="register"
          ? <Onboarding onBack={()=>setAuthMode("login")} C={C} t={t}/>
          : <LoginScreen onRegister={()=>setAuthMode("register")} C={C} t={t} dark={dark} setDark={setDark} lang={lang} setLang={setLang}/>
        }
      </LangCtx.Provider>
    </DarkCtx.Provider>
  );

  const SidebarContent=()=>(
    <>
      <div style={{padding:"18px 16px 14px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.teal},${C.tealL})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🐾</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:"#fff",fontWeight:800,fontSize:15,letterSpacing:"-0.5px"}}>VetConnect</div>
          <div style={{color:C.tealL,fontSize:9,fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>{t("appSub")||"Rede Global"}</div>
        </div>
        {(isMobile||isTablet)&&<button onClick={()=>setSidebarOpen(false)} style={{background:"none",border:"none",cursor:"pointer",flexShrink:0}} aria-label={t("close")}><Icon d={ic.x} size={18} color={C.mist}/></button>}
      </div>
      <div style={{padding:"10px 12px 4px",display:"flex",gap:8}}>
        <button onClick={()=>{setLangOpen(true);setSidebarOpen(false);}} style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"8px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:C.mist}}>
          <span style={{fontSize:15}}>{currentLang.flag}</span>
          <span style={{flex:1,fontSize:11,color:"#fff",fontWeight:500,textAlign:"left"}}>{currentLang.label}</span>
          <Icon d={ic.globe} size={13} color={C.mist}/>
        </button>
        <button onClick={()=>setDark(d=>!d)} aria-label="Modo escuro" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"8px 10px",cursor:"pointer",display:"flex",alignItems:"center"}}>
          <Icon d={dark?ic.sun:ic.moon} size={16} color="#fff"/>
        </button>
      </div>
      <nav style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
        {NAV.map(item=>(
          <div key={item.id} onClick={()=>{changeTab(item.id);if(isMobile||isTablet)setSidebarOpen(false);}} role="button" aria-label={item.label}
            style={{display:"flex",alignItems:"center",gap:11,padding:"10px 18px",cursor:"pointer",background:mainTab===item.id?`linear-gradient(90deg,${C.teal},${C.tealL}22)`:"transparent",borderLeft:mainTab===item.id?`3px solid ${C.tealL}`:"3px solid transparent",color:mainTab===item.id?"#fff":C.mist,fontSize:13,fontWeight:mainTab===item.id?600:400,marginBottom:1,transition:"all .15s"}}>
            <Icon d={item.icon} size={17} color={mainTab===item.id?C.tealL:C.mist}/>
            <span style={{flex:1}}>{item.label}</span>
            {item.badge&&<div style={{background:C.rose,color:"#fff",borderRadius:9,padding:"1px 6px",fontSize:10,fontWeight:700}}>{item.badge}</div>}
            {item.betaBadge&&<span style={{fontSize:9,background:C.purple+"40",color:C.purple,borderRadius:4,padding:"2px 5px",fontWeight:700}}>BETA</span>}
          </div>
        ))}
        <div style={{height:1,background:"rgba(255,255,255,0.07)",margin:"8px 16px"}}/>
        {[{id:"profile",label:t("nav_profile"),icon:ic.user},{id:"settings",label:t("settings"),icon:ic.cog}].map(item=>(
          <div key={item.id} onClick={()=>{changeTab(item.id);if(isMobile||isTablet)setSidebarOpen(false);}} role="button"
            style={{display:"flex",alignItems:"center",gap:11,padding:"9px 18px",cursor:"pointer",color:mainTab===item.id?"#fff":C.mist,fontSize:13,fontWeight:mainTab===item.id?600:400,transition:"all .15s"}}>
            <Icon d={item.icon} size={17} color={mainTab===item.id?C.tealL:C.mist}/>{item.label}
          </div>
        ))}
      </nav>
      <div style={{padding:14,borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>{changeTab("profile");if(isMobile||isTablet)setSidebarOpen(false);}} role="button" aria-label="Perfil">
        <div style={ava(C,34,true)}>{me.avatar}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:"#fff",fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{me.name}</div>
          <div style={{color:C.mist,fontSize:10,display:"flex",alignItems:"center",gap:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><span style={{width:6,height:6,borderRadius:"50%",background:C.emerald,display:"inline-block",flexShrink:0}}/> {me.spec}</div>
        </div>
        <Icon d={ic.cog} size={15} color={C.mist}/>
      </div>
    </>
  );

  return (
    <DarkCtx.Provider value={{dark,toggle:()=>setDark(d=>!d)}}>
      <LangCtx.Provider value={{lang,t}}>
        <div style={{display:"flex",height:"100vh",fontFamily:"'Inter','Segoe UI',sans-serif",background:C.bg,color:C.text,overflow:"hidden"}}>

          {!isMobile&&!isTablet&&(
            <div style={{width:230,background:C.night,display:"flex",flexDirection:"column",flexShrink:0}}>
              <SidebarContent/>
            </div>
          )}
          {isTablet&&!isMobile&&(
            <div style={{width:sidebarOpen?230:0,overflow:"hidden",background:C.night,display:"flex",flexDirection:"column",flexShrink:0,transition:"width .25s"}}>
              {sidebarOpen&&<SidebarContent/>}
            </div>
          )}
          {isMobile&&sidebarOpen&&(
            <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
              <div style={{background:C.night,width:265,display:"flex",flexDirection:"column",height:"100%"}}><SidebarContent/></div>
              <div style={{flex:1,background:"rgba(0,0,0,0.5)"}} onClick={()=>setSidebarOpen(false)}/>
            </div>
          )}

          {notifOpen&&<NotifPanel onClose={()=>setNotifOpen(false)} C={C} t={t} isMobile={isMobile} notifs={globalNotifs} setNotifs={setGlobalNotifs} setMainTab={setMainTab} meId={me.id}/>}
          {langOpen&&<LangPicker onClose={()=>setLangOpen(false)} lang={lang} setLang={setLang} C={C} t={t}/>}
          {searchOpen&&searchQ&&<SearchHub query={searchQ} onClose={()=>setSearchOpen(false)} C={C} t={t} setMainTab={setMainTab}/>}

          {moreOpen&&(
            <div style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.6)",zIndex:200,display:"flex",alignItems:"flex-end"}} onClick={()=>setMoreOpen(false)}>
              <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:"18px 18px 0 0",padding:"6px 0 28px",width:"100%",maxHeight:"60vh",overflowY:"auto"}}>
                <div style={{width:40,height:4,background:C.border,borderRadius:4,margin:"10px auto 14px"}}/>
                <div style={{fontWeight:700,fontSize:13,color:C.sub,padding:"0 20px 10px",textTransform:"uppercase",letterSpacing:1}}>Mais opções</div>
                <div onClick={()=>{setDark(d=>!d);setMoreOpen(false);}} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 20px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:38,height:38,borderRadius:10,background:C.mint,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon d={dark?ic.sun:ic.moon} size={18} color={C.teal}/></div>
                  <span style={{fontSize:15,fontWeight:500,color:C.text,flex:1}}>{dark?"Modo Claro":"Modo Escuro"}</span>
                </div>
                {MORE_ITEMS.map(item=>(
                  <div key={item.id} onClick={()=>{changeTab(item.id);setMoreOpen(false);}} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 20px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{width:38,height:38,borderRadius:10,background:C.mint,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon d={item.icon} size={18} color={C.teal}/></div>
                    <span style={{fontSize:15,fontWeight:500,color:C.text,flex:1}}>{item.label}</span>
                  </div>
                ))}
                <div onClick={()=>{setLangOpen(true);setMoreOpen(false);}} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 20px",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:38,height:38,borderRadius:10,background:C.mint,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon d={ic.globe} size={18} color={C.teal}/></div>
                  <span style={{fontSize:15,fontWeight:500,color:C.text,flex:1}}>{currentLang.flag} {currentLang.label}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:isMobile?"10px 12px":"11px 22px",display:"flex",alignItems:"center",gap:8,boxShadow:`0 1px 4px rgba(0,0,0,${dark?0.3:0.06})`,flexShrink:0}}>
              {(isMobile||isTablet)&&<button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}} aria-label="Menu"><Icon d={ic.menu} size={22} color={C.sub}/></button>}
              <div style={{fontWeight:700,fontSize:isMobile?14:16,flex:1,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tabLabel}</div>
              <div style={{flex:!isMobile?"0 0 260px":"0 0 auto",maxWidth:isMobile?145:"none"}}>
                <SearchBar
                  value={searchQ}
                  onChange={v=>{setSearchQ(v);if(v)setSearchOpen(true);else setSearchOpen(false);}}
                  onSearch={v=>{setSearchQ(v);setSearchOpen(!!v);}}
                  placeholder={isMobile?"Pesquisar…":t("search_placeholder")}
                  C={C}
                />
              </div>
              {!isMobile&&!isTablet&&(
                <button onClick={()=>setDark(d=>!d)} aria-label="Modo escuro" style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 9px",cursor:"pointer",display:"flex"}}>
                  <Icon d={dark?ic.sun:ic.moon} size={17} color={C.sub}/>
                </button>
              )}
              <button onClick={()=>setLangOpen(true)} aria-label="Idioma" style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:isMobile?"7px 8px":"7px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                <span style={{fontSize:16}}>{currentLang.flag}</span>
                {!isMobile&&<span style={{fontSize:11,fontWeight:600,color:C.sub}}>{currentLang.code.toUpperCase()}</span>}
              </button>
              <button onClick={()=>setNotifOpen(true)} aria-label={`Notificações — ${unreadNotifs} não lidas`} style={{position:"relative",background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 9px",cursor:"pointer",display:"flex",flexShrink:0}}>
                <Icon d={ic.bell} size={17} color={C.sub}/>
                {unreadNotifs>0&&<div style={{position:"absolute",top:3,right:3,width:8,height:8,background:C.rose,borderRadius:"50%",border:`2px solid ${C.surface}`}}/>}
              </button>
              <div style={{...ava(C,isMobile?30:36,true),flexShrink:0,cursor:"pointer"}} onClick={()=>changeTab("profile")} role="button" aria-label="Perfil">{me.avatar}</div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:isMobile?"14px 12px 80px":"22px 22px 22px"}}>
              {/* ── Beta Banner ───────────────────────────────────────────────── */}
              {!betaBannerDismissed&&(
                <div style={{background:`linear-gradient(135deg,${C.purple}22,${C.teal}18)`,border:`1px solid ${C.purple}40`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <div style={{fontSize:20,flexShrink:0}}>🚀</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.text}}>
                      {APP_NAME} {APP_VERSION} — Versão Beta
                    </div>
                    <div style={{fontSize:11,color:C.sub,marginTop:2}}>
                      Obrigado por testar! Encontrou um problema? Partilhe o seu feedback e ajude-nos a melhorar.
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <button onClick={()=>window.open("mailto:beta@vetconnect.pt?subject=Feedback+Beta+"+APP_VERSION,"_blank")}
                      style={{background:C.purple,color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                      📧 Enviar Feedback
                    </button>
                    <button onClick={()=>setBetaBannerDismissed(true)}
                      aria-label="Fechar aviso beta"
                      style={{background:"none",border:"none",cursor:"pointer",color:C.sub,fontSize:18,padding:"2px 4px"}}>✕</button>
                  </div>
                </div>
              )}
              {tabLoading
                ? <SkeletonFeed C={C}/>
                : <ActiveComp C={C} t={t} isMobile={isMobile} setMainTab={changeTab} me={me} profileLoaded={!!profile} onSignOut={signOut} onProfileSaved={()=>refreshProfile(session.user.id)}/>
              }
            </div>

            {isMobile&&(
              <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom,0px)",boxShadow:`0 -2px 12px rgba(0,0,0,${dark?0.3:0.08})`}}>
                {BOTTOM_NAV.map(item=>{
                  const isActive=item.id!=="more"&&mainTab===item.id;
                  return (
                    <button key={item.id} onClick={()=>item.id==="more"?setMoreOpen(true):changeTab(item.id)} aria-label={item.label}
                      style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"9px 4px",background:"none",border:"none",cursor:"pointer",position:"relative",color:isActive?C.teal:C.sub}}>
                      <Icon d={item.icon} size={22} color={isActive?C.teal:C.sub}/>
                      <span style={{fontSize:10,fontWeight:isActive?700:400}}>{item.label}</span>
                      {item.badge&&<div style={{position:"absolute",top:6,right:"calc(50% - 14px)",background:C.rose,color:"#fff",borderRadius:9,padding:"1px 5px",fontSize:9,fontWeight:700}}>{item.badge}</div>}
                      {isActive&&<div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:28,height:3,background:C.teal,borderRadius:"3px 3px 0 0"}}/>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── In-app Toast Notification ─────────────────────────────────────── */}
        {toast&&(
          <div style={{
            position:"fixed",
            top:isMobile?"auto":20,
            bottom:isMobile?88:"auto",
            left:"50%",
            transform:"translateX(-50%)",
            zIndex:999,
            maxWidth:400,
            width:"calc(100% - 32px)",
            animation:"toastIn .3s ease-out",
          }}>
            <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(${isMobile?"12px":"-12px"})}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
            <div style={{
              background:C.surface,
              border:`1px solid ${C.border}`,
              borderLeft:`4px solid ${toast.color||C.teal}`,
              borderRadius:14,
              boxShadow:"0 8px 32px rgba(0,0,0,0.22)",
              padding:"14px 16px",
              display:"flex",
              alignItems:"center",
              gap:12,
            }}>
              {/* Avatar */}
              <div style={{
                width:42,height:42,borderRadius:"50%",flexShrink:0,
                background:`linear-gradient(135deg,${toast.color||C.teal},${toast.color||C.teal}88)`,
                display:"flex",alignItems:"center",justifyContent:"center",
                color:"#fff",fontWeight:700,fontSize:14,
              }}>{toast.avatar}</div>
              {/* Text */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{toast.user}</div>
                <div style={{fontSize:12,color:C.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{toast.action}</div>
                {toast.target&&<div style={{fontSize:11,color:C.sub,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{toast.target}</div>}
              </div>
              {/* Actions */}
              <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0,alignItems:"flex-end"}}>
                <button onClick={()=>setToast(null)} aria-label="Fechar notificação"
                  style={{background:"none",border:"none",cursor:"pointer",color:C.sub,fontSize:16,lineHeight:1,padding:2}}>✕</button>
                <button onClick={()=>{
                  const dest={like:"home",comment:"home",case_comment:"clinic",follow:"home",msg:"community",live:"learn",match:"market",job:"market",ai:"clinic"}[toast.type];
                  if(dest) setMainTab(dest);
                  setToast(null); setNotifOpen(true);
                }}
                  style={{background:toast.color||C.teal,color:"#fff",border:"none",borderRadius:7,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  Ver →
                </button>
              </div>
            </div>
          </div>
        )}

      </LangCtx.Provider>
    </DarkCtx.Provider>
  );
}
