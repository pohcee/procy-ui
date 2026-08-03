<template>
	<div class="flex-1 max-h-screen scrollbar-hide xl:overflow-y-auto">
		<div
			class="h-screen max-h-screen px-4 py-10 mx-auto max-w-7xl sm:px-6 lg:px-8 lg:py-12"
		>
			<div class="relative w-full h-full">
				<device-header :device="device" />
				<div class="absolute inset-0 w-full h-full">
					<div
						v-if="!isAddingTunnel"
						class="z-10 w-full h-full pt-16"
					>
						<!-- Create tabs from here -->
						<Tabs v-model="selectedTab">
							<div class="relative z-20 text-center text-sm font-bold text-muted after:absolute after:-left-0 after:-right-0 after:bottom-0 after:h-px after:bg-theme-border after:content-['']">
								<div class="flex items-center">
									<TabsList
										class="relative flex w-full border-b border-mauve6"
									>
										<ul
											class="relative flex justify-start w-full gap-0 -mb-px transition flex-nowrap"
										>
												<TabsTrigger
													as="li"
													value="inventory"
													class="w-1/10 min-w-min cursor-pointer whitespace-nowrap border-b-[3px] border-transparent"
												>
													<span
														class="flex items-center justify-center w-full px-8 py-4 rounded-t-lg text-theme-inverted-lighter text-gray-600 hover:text-primary-600"
													>
														Inventory
													</span>
												</TabsTrigger>
												<TabsTrigger
													as="li"
													value="tunnels"
													class="w-1/10 min-w-min cursor-pointer whitespace-nowrap border-b-[3px] border-transparent"
												>
													<span
														class="flex items-center justify-center w-full px-8 py-4 rounded-t-lg text-theme-inverted-lighter text-gray-600 hover:text-primary-600"
													>
														Tunnels
													</span>
												</TabsTrigger>
												<TabsTrigger
													as="li"
													value="meta-data"
													class="w-1/10 min-w-min cursor-pointer whitespace-nowrap border-b-[3px] border-transparent"
												>
													<span
														class="flex items-center justify-center w-full px-8 py-4 rounded-t-lg text-theme-inverted-lighter text-gray-600 hover:text-primary-600"
													>
														Meta-Data
													</span>
												</TabsTrigger>
												<TabsTrigger
													as="li"
													value="monitoring"
													class="w-1/10 min-w-min cursor-pointer whitespace-nowrap border-b-[3px] border-transparent"
												>
													<span
														class="flex items-center justify-center w-full px-8 py-4 rounded-t-lg text-theme-inverted-lighter text-gray-600 hover:text-primary-600"
													>
														Monitoring
													</span>
												</TabsTrigger>
												<TabsTrigger
													as="li"
													value="files"
													class="w-1/10 min-w-min cursor-pointer whitespace-nowrap border-b-[3px] border-transparent"
												>
													<span
														class="flex items-center justify-center w-full px-8 py-4 rounded-t-lg text-theme-inverted-lighter text-gray-600 hover:text-primary-600"
													>
														Files
													</span>
												</TabsTrigger>
												<TabsTrigger
													as="li"
													value="audit"
													class="w-1/10 min-w-min cursor-pointer whitespace-nowrap border-b-[3px] border-transparent"
												>
													<span
														class="flex items-center justify-center w-full px-8 py-4 rounded-t-lg text-theme-inverted-lighter text-gray-600 hover:text-primary-800"
													>
														Audit
													</span>
												</TabsTrigger>
												<TabsTrigger
													as="li"
													value="schedules"
													class="w-1/10 min-w-min cursor-pointer whitespace-nowrap border-b-[3px] border-transparent"
												>
													<span
														class="flex items-center justify-center w-full px-8 py-4 rounded-t-lg text-theme-inverted-lighter text-gray-600 hover:text-primary-800"
													>
														Schedules
													</span>
												</TabsTrigger>
											</ul>
									</TabsList>
								</div>
							</div>
							<div class="absolute inset-0 z-0 w-full pt-12 top-20">
								<div class="flex h-full flex-nowrap">
									<div class="flex-1 w-full h-full">
										<div class="px-1 text-sm font-normal">
											<TabsContent value="inventory">
												<DeviceInventoryTab
													:device="device"
													:metrics="metrics"
													:disks="disks"
												/>
											</TabsContent>
											<TabsContent value="tunnels">
												<DeviceTunnelsTab
													:id="device.id"
													@addtunnel="tunnelStore.openAddTunel()"
												/>
											</TabsContent>
											<TabsContent value="meta-data">
												<DeviceMetaDataTab />
											</TabsContent>
											<TabsContent value="monitoring">
												<DeviceMonitoringTab
													:device="device"
													:metrics="metrics"
													:disk-history="diskHistory"
												/>
											</TabsContent>
											<TabsContent value="files">
												<DeviceFilesTab :device="device" />
											</TabsContent>
											<TabsContent value="audit">
												<DeviceAuditTab :id="device.id" />
											</TabsContent>
											<TabsContent value="schedules">
												<DeviceSchedulesTab :id="device.id" />
											</TabsContent>
										</div>
									</div>
								</div>
							</div>
						</Tabs>
					</div>
					<TunnelsTunnelForm
						v-if="isAddingTunnel"
						:device="device"
					/>
				</div>
				<div
					class="fixed inset-0 z-50 overflow-y-auto transition"
					style="display: none"
				>
					<div
						class="fixed inset-0 transition bg-theme-backdrop/75"
					/>
					<div
						class="fixed inset-0 overflow-y-auto transition"
						style="display: none"
					>
						<div
							class="flex items-center justify-center min-h-full text-center"
						>
							<div
								class="relative px-6 py-4 mx-4 overflow-hidden text-left transform rounded shadow-xl bg-theme sm:w-full sm:max-w-lg"
							>
								<div as="div">
									<h3
										class="mt-2 text-3xl font-medium leading-6 text-theme-inverted"
									>
										<span
											class="text-sm font-medium text-gray-600"
										>Are you sure?</span>
									</h3>
								</div>
								<div class="pt-4 pb-2">
									<div
										class="text-sm font-medium text-black-087"
									>
										Are you sure you want to delete this
										note?
									</div>
								</div>
								<div class="flex justify-end mt-5">
									<button
										class="inline-flex items-center px-4 py-2 mr-2 text-sm text-white duration-200 rounded hover:opacity-80 focus:outline-none primary-800 plain"
										type="button"
									>
										No
									</button><button
										class="inline-flex items-center px-4 py-2 text-sm text-white duration-200 rounded hover:opacity-80 focus:outline-none primary-800"
										type="button"
									>
										Yes
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div>
					<div
						class="fixed inset-0 z-50 overflow-y-auto transition"
						style="display: none"
					>
						<div
							class="fixed inset-0 transition bg-theme-backdrop/75"
						/>
						<div
							class="fixed inset-0 overflow-y-auto transition"
							style="display: none"
						>
							<div
								class="flex items-center justify-center min-h-full text-center"
							>
								<div
									class="relative px-6 py-4 mx-4 overflow-hidden text-left transform rounded shadow-xl bg-theme sm:w-full sm:max-w-lg"
								>
									<div as="div">
										<h3
											class="mt-2 text-3xl font-medium leading-6 text-theme-inverted"
										>
											Are you sure?
										</h3>
									</div>
									<div class="pt-4 pb-2">
										<div class="text-sm text-gray-700">
											Are you sure you want to delete this
											schedule?
										</div>
									</div>
									<div class="flex justify-end mt-5">
										<button
											class="inline-flex items-center px-4 py-2 mr-2 text-sm text-white duration-200 rounded hover:opacity-80 focus:outline-none primary-800 plain"
											type="button"
										>
											No
										</button><button
											class="inline-flex items-center px-4 py-2 text-sm text-white duration-200 rounded hover:opacity-80 focus:outline-none primary-800"
											type="button"
										>
											Yes
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div />
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs';
import DeviceHeader from '~/components/device/DeviceHeader.vue';
import { useClientDetail } from '~/composables/useClientDetail';

const tunnelStore = useTunnelStore();
const selectedTab = ref('inventory');

const { isAddingTunnel } = storeToRefs(tunnelStore);

const { device, metrics, disks, diskHistory } = useClientDetail();
</script>
