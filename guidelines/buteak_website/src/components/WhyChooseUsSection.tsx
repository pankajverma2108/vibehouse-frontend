// import React from 'react';
import { PhoneCall, Utensils, Dumbbell, Sofa, Coffee, WashingMachine, UserRound, Shield } from 'lucide-react';
import WhyChooseUsTitle from './why-choose-us/WhyChooseUsTitle';
import FeatureRow from './why-choose-us/FeatureRow';
import { motion } from 'framer-motion';
// import FeatureImage from '../FeatureImage';
// import FeatureText from '../FeatureText';
const WhyChooseUsSection = () => {
  const isFullWidth = false
  return (
    <section className="bg-white  pt-12 md:py-12 overflow-hidden">
      {/* <div className="container px-4 mx-auto"> */}
      {/* Title */}
      <WhyChooseUsTitle />
      {/* 
        <div className='mb-10 flex md:gap-4 gap-2'>
          <div>
            <div className='flex items-left md:items-center md:gap-4 gap-2 mb-2'>
              <img src="images/logo-flower.svg" alt="logo-flower" className="md:w-[42px] md:h-[42px] w-[20px] w-[20px] rounded-lg " />
              <h3 className='text-[18px] md:text-[28px] text-left md:text-center  text-[#3A3A3A] font-[600]'>24/7 Reception</h3>
            </div>

            <div className="flex items-left md:items-center md:gap-4 gap-2 mb-2">
              <div className="flex md:p-4 p-2 flex-col items-center border-2 border-[#F0F0F0] rounded-xl">
                <motion.div
                  className="w-[170px] md:w-[650px] h-[120px] md:h-[300px] mb-4 lg:mb-0"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >

                  <img src="images/features-images/24-7-reception.png" className="w-full h-full web_view rounded-lg" />
                  <img src="images/features-images/mob-reception.png" className="w-full h-full mob_view rounded-lg" />

                </motion.div>

                <motion.div
                  className="w-full justify-between md:flex md:px-8"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >

                  <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden '>
                    <img src="images/features-images/round-the-clock-service.svg" alt="regional-menu" className="md:w-16 md:h-16 w-10 h-10 rounded-lg " />
                    <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>Round the Clock Service</p>
                  </div>

                  <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden'>
                    <img src="images/features-images/everyday-cleaning.svg" alt="regional-menu" className="md:w-16 md:h-16 w-10 h-10  rounded-lg " />
                    <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>Everyday Cleaning</p>
                  </div>

                  <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden'>
                    <img src="images/features-images/flexible-check-in-out.svg" alt="breakfast-deliverey" className="md:w-16 md:h-16 w-10 h-10 rounded-lg " />
                    <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>Flexible Check In/Out</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>


          <div>
            <div className='flex items-left md:items-center gap-4 mb-2'>
              <img src="images/logo-flower.svg" alt="logo-flower" className="md:w-[42px] md:h-[42px] w-[20px] w-[20px] rounded-lg" />
              <h3 className='text-[18px] md:text-[28px] text-left md:text-center  text-[#3A3A3A] font-[600]'>Gym</h3>
            </div>
            <div className="flex items-left md:items-center md:gap-4 gap-2 mb-2">
              <div className="flex md:p-4 p-2 flex-col items-center border-2 border-[#F0F0F0] rounded-xl">
                <motion.div
                  className="w-[170px] md:w-[630px] h-[120px] md:h-[300px] mb-4 lg:mb-0"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <img src="images/features-images/gym.png" className="w-full h-full  web_view rounded-lg " />
                  <img src="images/features-images/mob-gym.png" className="w-full h-full  mob_view rounded-lg " />

                </motion.div>

                <motion.div
                  className="w-full justify-between md:flex md:px-8"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden'>
                    <img src="images/features-images/cult-gym-access.svg" alt="Cult Gym Access" className="md:w-16 md:h-16 w-10 h-10  rounded-lg " />
                    <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>Cult Elite <br /> Gym </p>
                  </div>
                  <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden'>
                    <img src="images/features-images/min-walk.svg" alt="Reception Support" className="md:w-16 md:h-16 w-10 h-10  rounded-lg " />
                    <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>5 Min Walk </p>

                  </div>
                  <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden'>
                    <img src="images/features-images/timing.svg" alt="Scheduled Sessions" className="md:w-16 md:h-16 w-10 h-10 rounded-lg " />
                    <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>6 am - 10 pm </p>

                  </div>

                </motion.div>
              </div>
            </div>
          </div>

        </div>

        <div className='mb-10'>
          <div className='flex items-left md:items-center gap-2 md:gap-4 mb-2'>
            <img src="images/logo-flower.svg" alt="logo-flower" className="md:w-[42px] md:h-[42px] w-[20px] w-[20px] rounded-lg" />
            <h3 className='text-[18px] md:text-[28px] text-left md:text-center  text-[#3A3A3A] font-[600]'>Complimentary Breakfast</h3>
          </div>

          <div className="flex p-2 px-0 md:px-12 md:p-4 flex-col items-center border-2 border-[#F0F0F0] rounded-xl">
            <motion.div
              className="w-[350px] md:w-[1352px] h-[120px] md:h-[300px] mb-0 md:mb-4 lg:mb-0"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}

            >
              <img src="images/features-images/eat-complimentary-breakfast.png" alt="Luxurious hotel lobby" className="w-full h-full web_view rounded-lg " />
              <img src="images/features-images/mob-eat.png" alt="Luxurious hotel lobby" className="w-full h-full mob_view rounded-lg " />
            </motion.div>

            <motion.div
              className="w-full px-12 justify-between flex"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className='flex p-4 pb-0 px-0  md:px-8 items-center flex-col justify-center flex-wrap gap-0 md:gap-4 rounded-xl overflow-hidden'>
                <img src="images/features-images/eat-fit.svg" alt="Eat Fit" className="md:w-16 md:h-16 w-10 h-10 rounded-lg" />
                <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400]'>Eat Fit</p>
              </div>
              <div className='flex p-4 pb-0 px-0 md:px-8 items-center flex-col justify-center flex-wrap gap-0 md:gap-4 rounded-xl overflow-hidden'>
                <img src="images/features-images/curated-menu.svg" alt="Curated Menu" className="md:w-16 md:h-16 w-10 h-10 rounded-lg" />
                <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400]'>Curated Menu</p>

              </div>
              <div className='flex p-4 pb-0 px-0 md:px-8 items-center flex-col justify-center flex-wrap gap-0 md:gap-4 rounded-xl overflow-hidden'>
                <img src="images/features-images/anytime-breakfast.svg" alt="Anytime Breakfast" className="md:w-16 md:h-16 w-10 h-10 rounded-lg" />
                <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400]'>Anytime Breakfast</p>

              </div>

            </motion.div>
          </div>
        </div>

        <div className='mb-10 flex md:gap-4 gap-2'>
          <div>
            <div className='flex items-left md:items-center md:gap-4 gap-2 mb-2'>
              <img src="images/logo-flower.svg" alt="logo-flower" className="md:w-[42px] md:h-[42px] w-[20px] w-[20px] rounded-lg " />
              <h3 className='text-[18px] md:text-[28px] text-left md:text-center  text-[#3A3A3A] font-[600]'>Kitchen</h3>
            </div>

            <div className="flex md:p-4 p-2 flex-col items-center border-2 border-[#F0F0F0] rounded-xl">
              <motion.div
                className="w-[170px] md:w-[650px] h-[120px] md:h-[300px] mb-4 lg:mb-0"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                <img src="/images/features-images/kitchen.png" className="w-full h-full web_view rounded-lg" />
                <img src="/images/features-images/mob-kitchen.png" className="w-full h-full mob_view rounded-lg" />

              </motion.div>

              <motion.div
                className="w-full justify-between md:flex md:px-8"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >

                <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden '>
                  <img src="images/features-images/complimentary-essentials.svg" alt="Complimentary Essentials" className="md:w-16 md:h-16 w-10 h-10 rounded-lg" />
                  <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>Complimentary Essentials</p>
                </div>

                <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden '>
                  <img src="images/features-images/unlimited-cleaning.svg" alt="Unlimited Cleaning" className="md:w-16 md:h-16 w-10 h-10 rounded-lg " />
                  <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>Unlimited Cleaning</p>
                </div>

                <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden '>
                  <img src="images/features-images/premium-kitchen-essentials.svg" alt="premium-kitchen-essentials" className="md:w-16 md:h-16 w-10 h-10 rounded-lg" />
                  <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>Premium Kitchen Essentials</p>
                </div>
              </motion.div>
            </div>
          </div>


          <div>
            <div className='flex items-left md:items-center md:gap-4 gap-2 mb-2'>
              <img src="images/logo-flower.svg" alt="logo-flower" className="md:w-[42px] md:h-[42px] w-[20px] w-[20px] rounded-lg" />
              <h3 className='text-[18px] md:text-[28px] text-left md:text-center  text-[#3A3A3A] font-[600]'>Laundry</h3>
            </div>

            <div className="flex items-left md:items-center gap-4 mb-2">
              <div className="flex md:p-4 p-2 flex-col items-center border-2 border-[#F0F0F0] rounded-xl">
                <motion.div
                  className="w-[170px] md:w-[630px] h-[120px] md:h-[300px] mb-4 lg:mb-0"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <img src="images/features-images/laundry.png" className="w-full h-full web_view rounded-lg " />
                  <img src="images/features-images/mob-loundry.png" className="w-full h-full mob_view rounded-lg " />

                </motion.div>

                <motion.div
                  className="w-full justify-between md:flex md:px-8"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden '>
                    <img src="images/features-images/2-pcs-day-free.svg" alt="2 pcs/day Free" className="md:w-16 md:h-16 w-10 h-10 rounded-lg" />
                    <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>2 pcs/day Free </p>
                  </div>
                  <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden '>
                    <img src="images/features-images/washing-machine.svg" alt="Washing Machine" className="md:w-16 md:h-16 w-10 h-10 rounded-lg" />
                    <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>Washing <br />Machine</p>

                  </div>
                  <div className='flex md:p-4 p-1 items-center items-left md:flex-col md:justify-center justify-left md:gap-4 gap-2 rounded-xl overflow-hidden '>
                    <img src="images/features-images/dryer.svg" alt="Dryer" className="md:w-16 md:h-16 w-10 h-10 rounded-lg " />
                    <p className='md:text-center text-left text-[#494949] text-[11px] md:text-[18px] font-[400] line_height'>Dryer</p>
                  </div>

                </motion.div>
              </div>
            </div>
          </div>

        </div> */}

      {/* </div> */}
      <div className="container mb-6 px-4 mx-auto">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6 lg:grid-cols-6">
          <div className="col-span-1 md:col-span-3">
            <div className={`${isFullWidth ? 'w-full mb-10' : ''}`}>
              <div className="flex items-center gap-2 md:gap-4 mb-2">
                <img src="images/logo-flower.svg" alt="logo-flower" className="w-5 h-5 md:w-[42px] md:h-[42px] rounded-lg" />
                <h3 className="text-[16px] md:text-[28px] text-[#3A3A3A] font-[600]">24/7 Reception</h3>
              </div>

              <div className={`border-2 border-[#F0F0F0] min-h-[220px] rounded-xl flex flex-col items-center p-2 md:p-4 ${isFullWidth ? '' : 'w-full'}`}>
                <motion.div
                  className={`w-full h-[120px] md:h-[300px] mb-4`}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <img src="images/features-images/24-7-reception.png" className="w-full h-full web_view rounded-lg" alt="web view" />
                  <img src="images/features-images/mob-reception.png" className="w-full h-full mob_view rounded-lg" alt="mobile view" />
                </motion.div>

                <motion.div
                  className="w-full grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-2 md:gap-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >

                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/round-the-clock-service.svg" alt="round-the-clock-service" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Round the Clock Service</p>
                  </div>

                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/everyday-cleaning.svg" alt="everyday-cleaning" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Everyday Cleaning</p>
                  </div>
                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/flexible-check-in-out.svg" alt="Flexible Check In/Out" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Flexible Check In/Out</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-3">
            <div className={`${isFullWidth ? 'w-full mb-10' : ''}`}>
              <div className="flex items-center gap-2 md:gap-4 mb-2">
                <img src="images/logo-flower.svg" alt="logo-flower" className="w-5 h-5 md:w-[42px] md:h-[42px] rounded-lg" />
                <h3 className="text-[16px] md:text-[28px] text-[#3A3A3A] font-[600]">Gym</h3>
              </div>

              <div className={`border-2 border-[#F0F0F0] min-h-[220px] rounded-xl flex flex-col items-center p-2 md:p-4 ${isFullWidth ? '' : 'w-full'}`}>
                <motion.div
                  className={`w-full h-[120px] md:h-[300px] mb-4`}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <img src="images/features-images/gym.png" className="w-full h-full web_view rounded-lg" alt="web view" />
                  <img src="images/features-images/mob-gym.png" className="w-full h-full mob_view rounded-lg" alt="mobile view" />
                </motion.div>

                <motion.div
                  className="w-full grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-2 md:gap-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >

                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/cult-gym-access.svg" alt="everyday-cleaning" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Gym</p>
                  </div>
                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/min-walk.svg" alt="Flexible Check In/Out" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">5 Min Walk</p>
                  </div>
                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/timing.svg" alt="round-the-clock-service" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">6 am - 10 pm</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* <div className="col-span-2 md:col-span-6">
            <div className={`${isFullWidth ? 'w-full mb-10' : ''}`}>
              <div className="flex items-center gap-2 md:gap-4 mb-2">
                <img src="images/logo-flower.svg" alt="logo-flower" className="w-5 h-5 md:w-[42px] md:h-[42px] rounded-lg" />
                <h3 className="text-[16px] md:text-[28px] text-[#3A3A3A] font-[600]">Complimentary Breakfast</h3>
              </div>

              <div className={`border-2 border-[#F0F0F0] min-h-[220px] rounded-xl flex flex-col items-center p-2 md:p-4 ${isFullWidth ? '' : 'w-full'}`}>
                <motion.div
                  className={`w-full h-[120px] md:h-[300px] mb-4`}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <img src="images/features-images/eat-complimentary-breakfast.png" className="w-full h-full web_view rounded-lg" alt="web view" />
                  <img src="images/features-images/mob-eat.png" className="w-full h-full mob_view rounded-lg" alt="mobile view" />
                </motion.div>

                <motion.div
                  className="w-full grid grid-cols-3 md:grid-cols-3 gap-0 md:gap-2 md:gap-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >

                  <div className="flex-col flex md:flex items-center justify-center md:flex-col md:justify-center items-center md:items-center gap-2 p-2 md:p-4">
                    <img src="images/features-images/eat-fit.svg" alt="everyday-cleaning" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Eat Fit</p>
                  </div>
                  <div className="flex-col flex  md:flex  md:justify-center items-center md:items-center gap-2 p-2 md:p-4">
                    <img src="images/features-images/curated-menu.svg" alt="Flexible Check In/Out" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Curated Men</p>
                  </div>
                  <div className="flex-col flex  md:flex  md:justify-center items-center md:items-center gap-2 p-2 md:p-4">
                    <img src="images/features-images/anytime-breakfast.svg" alt="round-the-clock-service" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Anytime Breakfast</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div> */}

          <div className="col-span-1 md:col-span-3">
            <div className={`${isFullWidth ? 'w-full mb-10' : ''}`}>
              <div className="flex items-center gap-2 md:gap-4 mb-2">
                <img src="images/logo-flower.svg" alt="logo-flower" className="w-5 h-5 md:w-[42px] md:h-[42px] rounded-lg" />
                <h3 className="text-[16px] md:text-[28px] text-[#3A3A3A] font-[600]">Kitchen</h3>
              </div>

              <div className={`border-2 border-[#F0F0F0] min-h-[220px] rounded-xl flex flex-col items-center p-2 md:p-4 ${isFullWidth ? '' : 'w-full'}`}>
                <motion.div
                  className={`w-full h-[120px] md:h-[300px] mb-4`}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <img src="images/features-images/kitchen.png" className="w-full h-full web_view rounded-lg" alt="web view" />
                  <img src="images/features-images/mob-kitchen.png" className="w-full h-full mob_view rounded-lg" alt="mobile view" />
                </motion.div>

                <motion.div
                  className="w-full grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-2 md:gap-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >

                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/complimentary-essentials.svg" alt="round-the-clock-service" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Complimentary Essentials</p>
                  </div>

                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2 md:p-2 py-1 md:p-4">
                    <img src="images/features-images/unlimited-cleaning.svg" alt="everyday-cleaning" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Unlimited Cleaning</p>
                  </div>
                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/premium-kitchen-essentials.svg" alt="Flexible Check In/Out" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Premium Kitchen Essentials</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-3">
            <div className={`${isFullWidth ? 'w-full mb-10' : ''}`}>
              <div className="flex items-center gap-2 md:gap-4 mb-2">
                <img src="images/logo-flower.svg" alt="logo-flower" className="w-5 h-5 md:w-[42px] md:h-[42px] rounded-lg" />
                <h3 className="text-[16px] md:text-[28px] text-[#3A3A3A] font-[600]">Laundry</h3>
              </div>

              <div className={`border-2 border-[#F0F0F0] min-h-[220px] rounded-xl flex flex-col items-center p-2 md:p-4 ${isFullWidth ? '' : 'w-full'}`}>
                <motion.div
                  className={`w-full h-[120px] md:h-[300px] mb-4`}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <img src="images/features-images/laundry.png" className="w-full h-full web_view rounded-lg" alt="web view" />
                  <img src="images/features-images/mob-laundry.png" className="w-full h-full mob_view rounded-lg" alt="mobile view" />
                </motion.div>

                <motion.div
                  className="w-full grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-2 md:gap-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >

                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/2-pcs-day-free.svg" alt="round-the-clock-service" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">2 pcs/day Free</p>
                  </div>

                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2 md:p-2 py-1 md:p-4">
                    <img src="images/features-images/washing-machine.svg" alt="everyday-cleaning" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">  Washing<br />
                      Machine</p>
                  </div>
                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2 md:p-2 py-1 md:p-4">
                    <img src="images/features-images/dryer.svg" alt="Flexible Check In/Out" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Dryer</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* <div className="col-span-1 md:col-span-3">
            <div className={`${isFullWidth ? 'w-full mb-10' : ''}`}>
              <div className="flex items-center gap-2 md:gap-4 mb-2">
                <img src="images/logo-flower.svg" alt="logo-flower" className="w-5 h-5 md:w-[42px] md:h-[42px] rounded-lg" />
                <h3 className="text-[16px] md:text-[28px] text-[#3A3A3A] font-[600]">Travel</h3>
              </div>

              <div className={`border-2 border-[#F0F0F0] min-h-[220px] rounded-xl flex flex-col items-center p-2 md:p-4 ${isFullWidth ? '' : 'w-full'}`}>
                <motion.div
                  className={`w-full h-[120px] md:h-[300px] mb-4`}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  
                  <img src="images/features-images/laundry.png" className="w-full h-full web_view rounded-lg" alt="web view" />
                  <img src="images/features-images/mob-laundry.png" className="w-full h-full mob_view rounded-lg" alt="mobile view" />
                </motion.div>

                <motion.div
                  className="w-full grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-2 md:gap-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >

                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2  md:p-2 py-1 md:p-4">
                    <img src="images/features-images/2-pcs-day-free.svg" alt="round-the-clock-service" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">2 pcs/day Free</p>
                  </div>

                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2 md:p-2 py-1 md:p-4">
                    <img src="images/features-images/washing-machine.svg" alt="everyday-cleaning" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">  Washing<br />
                      Machine</p>
                  </div>
                  <div className="flex md:flex-col md:justify-center items-center md:items-center gap-2 md:p-2 py-1 md:p-4">
                    <img src="images/features-images/dryer.svg" alt="Flexible Check In/Out" className="w-10 h-10 md:w-16 md:h-16 rounded-lg" />
                    <p className="text-[12px] md:text-[18px] text-[#494949] font-[400] block text-left line_height leading-tight break-words md:text-center">Dryer</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div> */}

        </div>

      </div>
    </section >
  );
};

export default WhyChooseUsSection;

