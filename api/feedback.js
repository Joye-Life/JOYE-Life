const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES = new Set(['idea','bug','confusing','general']);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const { type='general', rating=3, message='', email='', mayContact=false, company='', profileName='', page='', source='dashboard' } = request.body || {};
  if (company) return response.status(200).json({ message: 'Thank you. Your feedback was sent.' });

  const cleanMessage=String(message).trim();
  const cleanEmail=String(email).trim().toLowerCase();
  if(cleanMessage.length<3 || cleanMessage.length>2000) return response.status(400).json({error:'Enter feedback between 3 and 2,000 characters.'});
  if(cleanEmail && !EMAIL_PATTERN.test(cleanEmail)) return response.status(400).json({error:'Enter a valid email address or leave it blank.'});

  const record={
    feedback_type:TYPES.has(type)?type:'general',
    rating:Math.max(1,Math.min(5,Number(rating)||3)),
    message:cleanMessage,
    email:cleanEmail||null,
    may_contact:Boolean(mayContact),
    profile_name:String(profileName).slice(0,80)||null,
    page:String(page).slice(0,200)||null,
    source:String(source).slice(0,80)||'dashboard',
    user_agent:String(request.headers['user-agent']||'').slice(0,500)
  };

  const url=process.env.SUPABASE_URL;
  const secret=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !secret) return response.status(503).json({error:'Feedback setup is not complete yet.'});

  try{
    const dbResponse=await fetch(`${url}/rest/v1/feedback`,{
      method:'POST',
      headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify(record)
    });
    if(!dbResponse.ok){
      const detail=await dbResponse.text();
      console.error('Feedback database insert failed:',dbResponse.status,detail);
      return response.status(502).json({error:'Unable to save feedback right now.'});
    }

    let emailSent=false;
    const resendKey=process.env.RESEND_API_KEY;
    const toEmail=process.env.FEEDBACK_TO_EMAIL;
    if(resendKey && toEmail){
      const fromEmail=process.env.FEEDBACK_FROM_EMAIL || 'Joye Life Feedback <onboarding@resend.dev>';
      const subject=`Joye Life feedback: ${record.feedback_type} (${record.rating}/5)`;
      const emailBody=[
        `Type: ${record.feedback_type}`,
        `Rating: ${record.rating}/5`,
        `From: ${record.email || 'No email provided'}`,
        `May contact: ${record.may_contact ? 'Yes' : 'No'}`,
        `Profile name: ${record.profile_name || 'Not provided'}`,
        `Page: ${record.page || 'Not provided'}`,
        '',
        record.message
      ].join('\n');
      const mailResponse=await fetch('https://api.resend.com/emails',{
        method:'POST',headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({from:fromEmail,to:[toEmail],reply_to:record.email||undefined,subject,text:emailBody})
      });
      if(mailResponse.ok) emailSent=true;
      else console.error('Feedback email failed:',mailResponse.status,await mailResponse.text());
    }

    return response.status(200).json({message:emailSent?'Thank you. Your feedback was sent.':'Thank you. Your feedback was saved.'});
  }catch(error){
    console.error('Feedback function error:',error);
    return response.status(500).json({error:'Unable to send feedback right now.'});
  }
}
